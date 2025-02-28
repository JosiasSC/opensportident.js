import {SerialPort} from 'serialport';
import { PortInfo } from '@serialport/bindings-interface';
import moment from 'moment';
import { EventEmitter } from 'events';

import {
    BEEP,
    MSG_STARTUP_SEQUENCE, NAK,
    SET_MASTER_MODE, SI_CARD_8_PLUS_DETECTED, GET_SI_CARD_8_PLUS_BN,
    SI_CARD_5_DETECTED, GET_SI_CARD_5, SPORT_IDENT_VENDOR_ID
} from './codes';
import { Si8PlusDataFrame } from '../dataframe/Si8PlusDataFrame';
import { Si5DataFrame } from '../dataframe/Si5DataFrame';
import { SiMessage, buildWireMessage, decodeWireMessage, toDebugString } from './simessage';
import { SiPortId, SiEvent, SiPortDetectedMode } from '../opensportident';
import { SI_CARD_REMOVED, GET_SI_CARD_6_BN, SI_CARD_6_PLUS_DETECTED, GET_SYSTEM_VALUE, GET_SYSTEM_VALUE_CPC,
         MASK_CPC_EXTENDED_PROTOCOL, MASK_CPC_AUTOSEND, GET_SYSTEM_VALUE_CARD6BLOCKS, DATA_SI3_CARD_10_PLUS_SERIES, MASK_CPC_HANDSHAKE } from './codes';
import { SiDataFrame } from '../dataframe/SiDataFrame';
import { Si6DataFrame } from '../dataframe/Si6DataFrame';
import { DATA_SI2_CARD_6_STAR_SERIES, BN_SICARD_6_192, BN_SICARD_6, BN_SICARD_10PLUS, BN_SICARD_8_9 } from './codes';

export interface SiPortOptions {
    timeZero?: number;
    mute?: boolean;
    debug?: boolean;
}


export class SiPortReader {
    private port: SerialPort;
    private options: SiPortOptions;
    private eventEmitter: EventEmitter;
    private receivedOpcodeMap: Map<number, (WireMessage: any) => void> = new Map();
    private si6CardBlocks: number[] = [];
    private baudRate: number;

    private isSiCard10Plus: boolean = false;
    private isSiCard6Star: boolean = false;
    private temp: SiMessage[] = [];
    private readCompleted: boolean = false;

    constructor(portName: string, options?: SiPortOptions) {
        this.options = options || {};
        if (!this.options.timeZero) {
            this.options.timeZero = moment().startOf('day').valueOf();
        }
        this.eventEmitter = new EventEmitter();
        this.baudRate = 38400; // TODO: add 4800 in case of failure
        this.port = new SerialPort({
            path: portName, 
            baudRate: this.baudRate,
            autoOpen: false
        });
        this.port.on('error', err => this.emit('error', err));
        this.port.on('close', () => this.emit('close'));
        this.port.on('data', data => this.onDataReceived(data));
        this.port.on('open', () => this.send(MSG_STARTUP_SEQUENCE));

        this.receivedOpcodeMap.set(SET_MASTER_MODE, (m: any) => this.readConfig());
        this.receivedOpcodeMap.set(GET_SYSTEM_VALUE, (m: any) => this.onConfig(m));

        this.receivedOpcodeMap.set(BEEP, () => {});
        this.receivedOpcodeMap.set(SI_CARD_REMOVED, () => this.onSiCardRemoved());

        this.receivedOpcodeMap.set(SI_CARD_5_DETECTED, (m: any) => this.onSiCardDetected(m));
        this.receivedOpcodeMap.set(GET_SI_CARD_5, (m: any) => this.onSiCard5(m));

        this.receivedOpcodeMap.set(SI_CARD_6_PLUS_DETECTED, (m: any) => this.onSiCardDetected(m));
        this.receivedOpcodeMap.set(GET_SI_CARD_6_BN, (m: any) => this.onSiCard6(m));

        this.receivedOpcodeMap.set(SI_CARD_8_PLUS_DETECTED, (m: any) => this.onSiCardDetected(m));
        this.receivedOpcodeMap.set(GET_SI_CARD_8_PLUS_BN, (m: any) => this.onSiCard8Plus(m));
    }

    public on(event: SiEvent, listener: Function): void {
        this.eventEmitter.on(event, listener as (...args: any[]) => void);
    }

    public once(event: SiEvent, listener: Function): void {
        this.eventEmitter.once(event, listener as (...args: any[]) => void);
    }

    public removeListener(event: SiEvent, listener: Function): void {
        this.eventEmitter.removeListener(event, listener as (...args: any[]) => void);
    }

    public open() {
        this.port.open();
    }

    public close() {
        this.port.close();
    }

    private emit(event: SiEvent, ...params: any[]) {
        // send async to free the serial port as early as possible
        setImmediate(() => this.eventEmitter.emit(event, ...params));
    }

    private onSiCardDetected(received: SiMessage) {
        this.readCompleted = false;
        this.isSiCard10Plus = false;
        this.isSiCard6Star = false;
        this.temp = [];

        if (received.opcode === SI_CARD_5_DETECTED) {
            this.send(buildWireMessage(GET_SI_CARD_5));
        }
        else if (received.opcode === SI_CARD_6_PLUS_DETECTED) {
            this.isSiCard6Star = received.payload[3] === DATA_SI2_CARD_6_STAR_SERIES;
            this.send(buildWireMessage(GET_SI_CARD_6_BN, 0));
        }
        else if (received.opcode === SI_CARD_8_PLUS_DETECTED) {
            // read the SI number most significant byte... 
            this.isSiCard10Plus = received.payload[2] >= DATA_SI3_CARD_10_PLUS_SERIES;
            this.send(buildWireMessage(GET_SI_CARD_8_PLUS_BN, 0));
        }
    }
    private onSiCardRemoved() {
        if (!this.readCompleted) {
            this.emit('warning', 'SiCard removed too early');
        }
        this.readCompleted = false;
        this.isSiCard10Plus = false;
        this.temp = [];
    }

    private onSiCard6(received: SiMessage) {
        let bn = this.isSiCard6Star ? BN_SICARD_6_192 : this.si6CardBlocks;
        this.handleChainedBlocks(received, bn, GET_SI_CARD_6_BN, (msg) => new Si6DataFrame(msg));
    }

    private onSiCard8Plus(received: SiMessage) {
        if (this.isSiCard10Plus) {
            this.handleChainedBlocks(received, BN_SICARD_10PLUS, GET_SI_CARD_8_PLUS_BN, (msg) => new Si8PlusDataFrame(msg));
        }
        else {
            this.handleChainedBlocks(received, BN_SICARD_8_9, GET_SI_CARD_8_PLUS_BN, (msg) => new Si8PlusDataFrame(msg));
        }
    }

    private handleChainedBlocks(received: SiMessage, expectedBlocks: number[], opcode: number | null, frameBuilder: (m: SiMessage[]) => SiDataFrame) {
        // const blockNumber = received.params[2];
        // accumulate
        this.temp.push(received)

        if (this.temp.length < expectedBlocks.length) {
            let bn = expectedBlocks[this.temp.length];
            this.send(buildWireMessage(opcode ?? 0, bn as number));
        }
        else if (!this.readCompleted) {
            this.readCompleted = true;
            this.beep(1);
            let frame = frameBuilder(this.temp).startingAt(this.options.timeZero ?? 0);
            this.emit('readout', frame.extract());
        }
    }

    private onSiCard5(received: SiMessage) {
        if (!this.readCompleted) {
            this.readCompleted = true;
            this.beep(1);
            let frame = new Si5DataFrame(received).startingAt(this.options.timeZero ?? 0);
            this.emit('readout', frame.extract());
        }
    }

    private beep(count: number) {
        if (count > 0 && !this.options.mute) {
            const msg = buildWireMessage(BEEP, count);
            this.send(msg);
        }
    }

    private readConfig() {
        // first read the protocol config
        const msg = buildWireMessage(GET_SYSTEM_VALUE, GET_SYSTEM_VALUE_CPC);
        this.send(msg);
    }

    private onConfig(received: SiMessage) {
        const configZone = received.payload[2];
        if (configZone === GET_SYSTEM_VALUE_CPC) {
            const cpc = received.payload[3];
            if (!(cpc & MASK_CPC_EXTENDED_PROTOCOL)) {
                this.emit('error', 'Station should be setup in extended protocol');
            }
            if (cpc & MASK_CPC_AUTOSEND) {
                this.emit('error', 'Master station should not be setup in auto-send');
            }
            if (!(cpc & MASK_CPC_HANDSHAKE)) {
                this.emit('error', 'Station should be setup in handshake mode');
            }

            // then read the cardBlocks config
            const msg = buildWireMessage(GET_SYSTEM_VALUE, GET_SYSTEM_VALUE_CARD6BLOCKS);
            this.send(msg);
        }
        else if (configZone === GET_SYSTEM_VALUE_CARD6BLOCKS) {
            let cardBlocksByte = received.payload[3];
            if (cardBlocksByte === 0x0) {
                // For compatibility reasons CardBlocks = 0x00 is interpreted like CardBlocks = 0xC1 which addresses blocks 0,6,7
                cardBlocksByte = 0xc1;
            }
            if (cardBlocksByte === 0xc1) {
                this.si6CardBlocks = BN_SICARD_6;
            }
            else if (cardBlocksByte === 0xff) {
                this.si6CardBlocks = BN_SICARD_6_192;
            }
            else {
                this.emit('error', `Unsupported SiCard6 cardblock mode: ${cardBlocksByte}`)
            }
            this.onStartupOk({ siCard6Punches: 32 * (this.si6CardBlocks.length - 1), baudRate: this.baudRate })
        }
    }

    private onStartupOk(mode: SiPortDetectedMode) {
        this.beep(2);
        this.emit('open', mode);
    }

    private send(data: Uint8Array): void {
        if (this.options.debug) {
            console.log(` => ${toDebugString(data)}`);
        }
        this.port.write(data);
    }
    private onDataReceived(data: Uint8Array): void {
        if (this.options.debug) {
            console.log(` <- ${toDebugString(data)}`);
        }
        if (data[0] === NAK) {
            this.emit('error', 'Received ERROR (NAK) from SPORTident station');
        }
        else {
            let msg = decodeWireMessage(data);
            if (msg instanceof SiMessage) {
                const next = this.receivedOpcodeMap.get(msg.opcode);
                if (next) {
                    next(msg);
                }
                else {
                    this.emit('warning', `Ignored received opcode: ${msg.opcode}`);
                }
            }
            else {
                this.emit('error', msg);
            }
        }
    }
}


export async function listSiPorts(cb: (err: string | null, ports: SiPortId[]) => void): Promise<void> {
    try {
        const ports = await SerialPort.list();
        // console.log(ports);
        const ar = ports.filter((conf: PortInfo) => conf.vendorId === SPORT_IDENT_VENDOR_ID).map((conf: PortInfo) => {
            return {
                comName: conf.path,
                serialNumber: conf.serialNumber ?? ''
            } as SiPortId;
        });
        cb(null, ar as SiPortId[]);
    } catch (err: any) {
        cb(err.toString(), []);
    }
}
