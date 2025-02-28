export const SPORT_IDENT_VENDOR_ID = "10c4";

/*
 * Basic protocol instructions
 */
export const WAKEUP = 0xFF;
export const STX = 0x02;
export const ETX = 0x03;
export const ACK = 0x06;
export const NAK = 0x15;

/*
 * Command instructions
 */
export const GET_SYSTEM_VALUE = 0x83;
export const SET_MASTER_MODE = 0xF0;
export const DIRECT_MODE = 0x4d;
export const BEEP = 0xF9;

/**
 * Parameters for the GET_SYSTEM_VALUE command
 */
export const GET_SYSTEM_VALUE_CPC = 0x74;
export const GET_SYSTEM_VALUE_CARD6BLOCKS = 0x33;

/**
 * Bitmask for the CPC field read by GET_SYSTEM_VALUE(0x74)
 */
export const MASK_CPC_EXTENDED_PROTOCOL = 0x1;
export const MASK_CPC_AUTOSEND = 0x2;
export const MASK_CPC_HANDSHAKE = 0x4; // why two bits? isn't AUTOSEND the opposite of HANDSHAKE?

/*
 * Card detected/removed
 */
export const SI_CARD_5_DETECTED = 0xE5;
export const SI_CARD_6_PLUS_DETECTED = 0xE6;
export const SI_CARD_8_PLUS_DETECTED = 0xE8;
export const SI_CARD_REMOVED = 0xE7;

/*
 * Card Readout instructions
 */
export const GET_SI_CARD_5 = 0xB1;
export const GET_SI_CARD_6_BN = 0xE1;
export const GET_SI_CARD_8_PLUS_BN = 0xEF;

/*
 * SiCard generation by SI number
 * 
 * SI3    SI2    SI1    SI0
 * 00     07     A1     20          SI-Card 6
 * 00     FF     00     00          SI-Card 6* (192 punches)
 * 01     0F     42     40          SI-Card 9 (50 punches)
 * 02     1E     84     80          SI-Card 8 (30 punches)
 * 04     3D     09     00          pCard
 * 06     5B     8D     80          tCard
 * 0E     D5     9F     80          fCard
 * 0F     6A     CF     C0          SI-Card 10
 * 0F     7A     12     00          SIAC1
 * 0F     89     54     40          SI-Card 11
 */
export const DATA_SI3_CARD_10_PLUS_SERIES = 0x0F;
export const DATA_SI2_CARD_6_STAR_SERIES = 0xFF;
/**
 * This is not built dynamically because of the weird WAKEUP first token
 */
export const MSG_STARTUP_SEQUENCE = new Uint8Array([WAKEUP, STX, STX, SET_MASTER_MODE, 0x01, DIRECT_MODE, 0x6D, 0x0A, ETX]);

/**
 * The block numbers that need to be read
 */
export const BN_SICARD_8_9    = [0, 1];
export const BN_SICARD_10PLUS = [0, 4, 6, 7];
export const BN_SICARD_6      = [0, 6, 7];
export const BN_SICARD_6_192  = [0, 6, 7, 2, 3, 4, 5]; // 1 contains personal data, not punches

export const DEBUG_MAP: { [key: number]: string } = {
    0xFF: 'WAKEUP',
    0x02: 'STX',
    0x03: 'ETX',
    0x06: 'ACK',
    0x15: 'NAK',
    0x83: 'GET_SYSTEM_VALUE',
    0xF0: 'SET_MASTER_MODE',
    0x4d: 'DIRECT_MODE',
    0xF9: 'BEEP',
    0xE5: 'SI_CARD_5_DETECTED',
    0xE6: 'SI_CARD_6_PLUS_DETECTED',
    0xE8: 'SI_CARD_8_PLUS_DETECTED',
    0xE7: 'SI_CARD_REMOVED',
    0xB1: 'GET_SI_CARD_5',
    0xE1: 'GET_SI_CARD_6_BN',
    0xEF: 'GET_SI_CARD_8_PLUS_BN'
};
