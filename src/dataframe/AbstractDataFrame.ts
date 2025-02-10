/**
 * Copyright (c) 2013 Simon Denier
 */
import * as moment from 'moment';

import { SiDataFrame } from './SiDataFrame.js';
import { SiPunch, NO_TIME, SiReadout } from '../../opensportident.js';
export abstract class AbstractDataFrame implements SiDataFrame {

	protected siNumber: string | undefined;

	protected checkTime: number | undefined;

	protected startTime: number | undefined;

	protected finishTime: number | undefined;

	protected punches: SiPunch[] | undefined;

	abstract startingAt(zerohour: number): SiDataFrame;
	abstract getSiSeries(): string;

	public getSiNumber(): string | undefined {
		return this.siNumber;
	}

	public getStartTime(): number | undefined {
		return this.startTime;
	}

	public getFinishTime(): number | undefined {
		return this.finishTime;
	}

	public getCheckTime(): number | undefined {
		return this.checkTime;
	}

	public getPunches(): SiPunch[] | undefined {
		return this.punches;
	}

	public extract(): SiReadout {
		const ret = new SiReadout();
		ret.siCardSeries = this.getSiSeries();
		ret.siCardNumber = this.getSiNumber();
		ret.checkTimestampMs = this.getCheckTime();
		ret.startTimestampMs = this.getStartTime();
		ret.finishTimestampMs = this.getFinishTime();
		ret.punches = this.punches;
		return ret;
	}
}
