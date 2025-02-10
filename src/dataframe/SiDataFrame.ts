/**
 * Copyright (c) 2013 Simon Denier
 */
import { SiPunch, SiReadout } from '../../opensportident.js';

export interface SiDataFrame {
	startingAt(zerohour: number): SiDataFrame;
	getSiSeries(): string | undefined;

	getSiNumber(): string | undefined;

	getStartTime(): number | undefined;

	getFinishTime(): number | undefined;

	getCheckTime(): number | undefined;

	getPunches(): SiPunch[] | undefined;

	extract(): SiReadout;
}