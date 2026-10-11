import { expect, test } from "bun:test";
import { analyzeTerrain, summarizeTerrain } from "@my-ridings/plan-geometry";
import {
	DEFAULT_TERRAIN_SPEEDS,
	estimateTerrainMinutes,
	parseTerrainSpeeds,
	terrainTimeLabel,
} from "./terrain-time";
const track = Array.from({ length: 21 }, (_, i) => ({ x: 127, y: 37, d: i * 100, e: 100 }));
const summary = summarizeTerrain(analyzeTerrain(track), 0, 2);
test("uses each terrain distance/speed and scales monotonically", () => {
	expect(estimateTerrainMinutes(summary, DEFAULT_TERRAIN_SPEEDS)).toBeCloseTo((2 / 22) * 60);
	const twice = Object.fromEntries(
		Object.entries(DEFAULT_TERRAIN_SPEEDS).map(([k, v]) => [k, v * 2]),
	) as any;
	expect(estimateTerrainMinutes(summary, twice)).toBeCloseTo(
		estimateTerrainMinutes(summary, DEFAULT_TERRAIN_SPEEDS)! / 2,
	);
	const shorter = summarizeTerrain(analyzeTerrain(track), 0, 1);
	expect(estimateTerrainMinutes(shorter, DEFAULT_TERRAIN_SPEEDS)).toBeLessThan(
		estimateTerrainMinutes(summary, DEFAULT_TERRAIN_SPEEDS)!,
	);
});
test("unknown and uncovered terrain never become zero travel time", () => {
	const unknown = summarizeTerrain(
		analyzeTerrain(track.map((p) => ({ ...p, e: undefined }))),
		0,
		2,
	);
	expect(estimateTerrainMinutes(unknown, DEFAULT_TERRAIN_SPEEDS)).toBeNull();
	expect(estimateTerrainMinutes({ ...summary, segments: [] }, DEFAULT_TERRAIN_SPEEDS)).toBeNull();
	expect(
		estimateTerrainMinutes(summarizeTerrain(analyzeTerrain(track), 0, 0), DEFAULT_TERRAIN_SPEEDS),
	).toBe(0);
});
test("rejects malformed, incomplete and out-of-range stored settings", () => {
	for (const v of [
		null,
		{},
		{ ...DEFAULT_TERRAIN_SPEEDS, flat: 0 },
		{ ...DEFAULT_TERRAIN_SPEEDS, flat: NaN },
		{ ...DEFAULT_TERRAIN_SPEEDS, flat: 81 },
		{ ...DEFAULT_TERRAIN_SPEEDS, flat: "22" },
	])
		expect(parseTerrainSpeeds(v)).toBeNull();
	expect(parseTerrainSpeeds(DEFAULT_TERRAIN_SPEEDS)).toEqual(DEFAULT_TERRAIN_SPEEDS);
});
test("formats approximate moving time without claiming an arrival clock", () => {
	expect(terrainTimeLabel(60)).toBe("약 1시간");
	expect(terrainTimeLabel(61)).toBe("약 1시간 1분");
	expect(terrainTimeLabel(0)).toBe("약 0분");
	expect(terrainTimeLabel(null)).toContain("정보 부족");
});

test("mixed terrain uses separate configured speeds", () => {
	const mixed = {
		...summary,
		distanceKm: 2,
		segments: [
			{ startKm: 0, endKm: 1, kind: "flat", gainM: 0, lossM: 0 },
			{ startKm: 1, endKm: 2, kind: "climb", gainM: 100, lossM: 0 },
		],
	} as typeof summary;
	expect(estimateTerrainMinutes(mixed, DEFAULT_TERRAIN_SPEEDS)).toBeCloseTo((1 / 22 + 1 / 10) * 60);
});
