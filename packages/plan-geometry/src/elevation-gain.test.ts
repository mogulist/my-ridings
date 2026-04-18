import { describe, expect, test } from "bun:test";
import {
	calibrateThreshold,
	computeTrackElevationGainLoss,
} from "./elevation-gain";

describe("computeTrackElevationGainLoss", () => {
	test("평탄한 구간이면 획득·하강 0 (threshold 0)", () => {
		const pts = [
			{ x: 0, y: 0, d: 0, e: 100 },
			{ x: 1, y: 0, d: 500, e: 100 },
			{ x: 2, y: 0, d: 1000, e: 100 },
		];
		const r = computeTrackElevationGainLoss(pts, 0, 1, 0);
		expect(r.gain).toBe(0);
		expect(r.loss).toBe(0);
	});

	test("포인트가 1개뿐이면 0", () => {
		const pts = [{ x: 0, y: 0, d: 0, e: 100 }];
		const r = computeTrackElevationGainLoss(pts, 0, 0.001, 0);
		expect(r.gain).toBe(0);
		expect(r.loss).toBe(0);
	});
});

describe("calibrateThreshold", () => {
	test("유효 포인트 부족이면 0", () => {
		expect(calibrateThreshold([], 1000)).toBe(0);
		expect(calibrateThreshold([{ x: 0, y: 0, d: 0, e: 10 }], 1000)).toBe(0);
	});

	test("knownGain<=0 이면 0", () => {
		const pts = [
			{ x: 0, y: 0, d: 0, e: 100 },
			{ x: 1, y: 0, d: 1000, e: 110 },
		];
		expect(calibrateThreshold(pts, 0)).toBe(0);
	});
});
