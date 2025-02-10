/**
 * Copyright (c) 2013 Simon Denier
 */
import { AbstractDataFrame } from './AbstractDataFrame.js';
import { NO_TIME } from '../../opensportident.js';
export const NO_SI_TIME = 1000 * 0xEEEE;
export const TWELVE_HOURS = 1000 * 12 * 3600;
export const ONE_DAY = 2 * TWELVE_HOURS;
export abstract class SiAbstractDataFrame extends AbstractDataFrame {
	protected dataFrame: Uint8Array | undefined;

	protected byteAt(i: number): number | undefined {
		return this.dataFrame ? this.dataFrame[i] : undefined;
	}

	protected wordAt(i: number): number | undefined {
		return this.dataFrame ? (this.dataFrame[i] << 8 | this.dataFrame[i + 1]) : undefined;
	}

	protected block3At(i: number): number | undefined {
		const wordAt = this.wordAt(i + 1);
		return this.dataFrame && wordAt !== undefined ? (this.dataFrame[i] << 16 | wordAt) : undefined;
	}

	protected timestampAt(i: number): number | undefined {
		const wordAt = this.wordAt(i);
		if (wordAt !== undefined) {
			return 1000 * wordAt;
		}
	}

	public advanceTimePast(timestamp: number, refTime: number, stepTime: number): number {
		if (timestamp === NO_SI_TIME) {
			return NO_TIME;
		}
		if (refTime === NO_TIME) {
			return timestamp;
		}
		let newTimestamp = timestamp;
		// advance time until it is at least less than one hour before refTime
		// accomodates for drifting clocks or even controls with different daylight savings mode
		let baseTime = refTime - 3600000;
		while (newTimestamp < baseTime) {
			newTimestamp += stepTime;
		}
		return newTimestamp;
	}

	public newRefTime(refTime: number, punchTime: number): number {
		return punchTime != NO_TIME ? punchTime : refTime;
	}
}
