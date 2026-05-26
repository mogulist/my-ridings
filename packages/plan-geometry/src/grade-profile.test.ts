import { describe, expect, test } from "bun:test";
import {
	gradeBandForPercent,
	isWahooClimb,
	wahooMinAvgGradeForLength,
} from "./grade-thresholds";
import {
	climbRangeForSummit,
	computeGradeSegments,
	detectClimbs,
	summarizeClimbRange,
} from "./grade-profile";

describe("gradeBandForPercent", () => {
	test("Wahoo 구간 경계", () => {
		expect(gradeBandForPercent(-1)).toBe("descent");
		expect(gradeBandForPercent(0)).toBe("green");
		expect(gradeBandForPercent(3.9)).toBe("green");
		expect(gradeBandForPercent(4)).toBe("yellow");
		expect(gradeBandForPercent(7.9)).toBe("yellow");
		expect(gradeBandForPercent(8)).toBe("orange");
		expect(gradeBandForPercent(11.9)).toBe("orange");
		expect(gradeBandForPercent(12)).toBe("red");
		expect(gradeBandForPercent(19.9)).toBe("red");
		expect(gradeBandForPercent(20)).toBe("extreme");
	});
});

describe("isWahooClimb", () => {
	test("250m 미만은 클라임 아님", () => {
		expect(isWahooClimb(200, 10)).toBe(false);
	});

	test("400m 3% 평균은 클라임", () => {
		expect(isWahooClimb(400, 3)).toBe(true);
	});

	test("250m 7% 평균은 클라임", () => {
		expect(isWahooClimb(250, 7)).toBe(true);
	});

	test("250m 5%는 짧아서 불인정", () => {
		expect(isWahooClimb(250, 5)).toBe(false);
	});

	test("wahooMinAvgGradeForLength 보간", () => {
		expect(wahooMinAvgGradeForLength(250)).toBe(7);
		expect(wahooMinAvgGradeForLength(400)).toBe(3);
		expect(wahooMinAvgGradeForLength(325)).toBeCloseTo(5, 1);
	});
});

/** 5% 경사 1km 합성 트랙 */
function syntheticClimbTrack(): Array<{ x: number; y: number; d: number; e: number }> {
	const pts: Array<{ x: number; y: number; d: number; e: number }> = [];
	for (let m = 0; m <= 1200; m += 20) {
		pts.push({
			x: m / 1000,
			y: 0,
			d: m,
			e: 100 + m * 0.05,
		});
	}
	return pts;
}

describe("computeGradeSegments", () => {
	test("10m 구간이 생성된다", () => {
		const segs = computeGradeSegments(syntheticClimbTrack(), {
			startKm: 0,
			endKm: 1,
		});
		expect(segs.length).toBeGreaterThan(50);
		expect(segs[0].endDistanceM - segs[0].startDistanceM).toBe(10);
	});
});

describe("detectClimbs", () => {
	test("완만한 5% 1km 오르막을 클라임으로 탐지", () => {
		const climbs = detectClimbs(syntheticClimbTrack());
		expect(climbs.length).toBeGreaterThanOrEqual(1);
		const c = climbs[0];
		expect(c.lengthKm).toBeGreaterThan(0.8);
		expect(c.avgGradePercent).toBeGreaterThanOrEqual(3);
	});
});

describe("climbRangeForSummit", () => {
	test("정상 지점에서 역방향 구간을 반환", () => {
		const pts = syntheticClimbTrack();
		const summitKm = 1;
		const range = climbRangeForSummit(pts, summitKm);
		expect(range.endDistanceKm).toBe(summitKm);
		expect(range.startDistanceKm).toBeLessThan(summitKm);
	});
});

describe("summarizeClimbRange", () => {
	test("구간 요약 통계", () => {
		const s = summarizeClimbRange(syntheticClimbTrack(), 0, 1);
		expect(s.lengthKm).toBeCloseTo(1, 1);
		expect(s.elevationGainM).toBeGreaterThan(40);
	});
});
