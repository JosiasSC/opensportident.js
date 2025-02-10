import moment from 'moment';

export const NO_TIME = -1;

export interface SiPunch {
	controlCode: number;
	timestampMs: number;
}
export class SiReadout {
	siCardSeries: string | undefined;
	siCardNumber: string | undefined;
	checkTimestampMs: number | undefined;
	startTimestampMs: number | undefined;
	finishTimestampMs: number | undefined;
	punches: SiPunch[] | undefined;

	toDebugString(): string {
		const start = this.formatTime(this.startTimestampMs || 0);
		const finish = this.formatTime(this.finishTimestampMs || 0);
		const check = this.formatTime(this.checkTimestampMs || 0);
		const count = this.punches ? this.punches.length : 0;
		// const indenting = ' '.repeat(this.siCardSeries.length + 1);
		let ret = `${this.siCardSeries}: ${this.siCardNumber} check(${check}) start(${start}) finish(${finish})`;
		if (this.punches) {
			for (let i = 0; i < count; i++) {
				ret += `\n    - ${i<9?' ':''}${i + 1}:${this.punches[i].controlCode} ${this.formatTime(this.punches[i].timestampMs)}`;
			}
		}
		return ret;
	}

	private formatTime(timestamp: number): string {
		if (timestamp === NO_TIME) {
			return "no time";
		} else {
			return moment.utc(timestamp).format('ddd HH:mm:ss');
		}
	}
}

export interface SiPortId {
	comName: string;
	serialNumber: string;
}
export type SiEvent = 'open' | 'close' | 'readout' | 'error' | 'warning';
export { SiPortReader, listSiPorts } from './src/si/siport.js';

export interface SiPortDetectedMode {
	siCard6Punches: number;
	baudRate: number;
}