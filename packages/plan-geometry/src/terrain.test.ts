import { describe, expect, test } from "bun:test";
import { analyzeTerrain, summarizeTerrain, nextTerrainClimb } from "./terrain";
const track = (fn: (km: number) => number, end = 10, step = 50) =>
	Array.from({ length: Math.floor((end * 1000) / step) + 1 }, (_, i) => ({
		x: 127,
		y: 37,
		d: i * step,
		e: fn((i * step) / 1000),
	}));

describe("terrain before a destination", () => {
	test("distinguishes long flat, gentle descent and descent", () => {
		for (const [gradient, kind] of [
			[0, "flat"],
			[-10, "gentle-descent"],
			[-50, "descent"],
		] as const) {
			const result = summarizeTerrain(
				analyzeTerrain(track((km) => 700 + gradient * km)),
				0.23,
				8.74,
			);
			expect(result.distances[kind]).toBeCloseTo(8.51);
			expect(result.gainM).toBe(0);
		}
	});
	test("a net descending road still exposes repeated effort", () => {
		const result = summarizeTerrain(
			analyzeTerrain(track((km) => 700 - 5 * km + 15 * Math.sin(km * Math.PI * 4))),
			0,
			10,
		);
		expect(result.distances.rolling).toBeGreaterThan(8);
		expect(result.gainM).toBeGreaterThan(300);
		expect(result.lossM).toBeGreaterThan(result.gainM!);
	});
	test("finds an unregistered sustained climb after a long approach", () => {
		const a = analyzeTerrain(
			track((km) => (km < 4 ? 100 : km < 7 ? 100 + (km - 4) * 50 : 250 - (km - 7) * 40)),
		);
		expect(a.climbs).toHaveLength(1);
		expect(a.climbs[0].startKm).toBeCloseTo(4);
		expect(a.climbs[0].summitKm).toBeCloseTo(7);
		expect(a.climbs[0].gainM).toBeGreaterThanOrEqual(145);
		expect(a.climbs[0].gainM).toBeLessThanOrEqual(150);
		expect(nextTerrainClimb(a, 5, 6)?.id).toBe(a.climbs[0].id);
		expect(nextTerrainClimb(a, 7.1, 10)).toBeNull();
		const partial = summarizeTerrain(a, 5, 6);
		expect(partial.distanceKm).toBe(1);
		expect(partial.gainM).toBe(50);
		expect(partial.distances.climb).toBeCloseTo(1);
	});
	test("preserves flat distance between two climbs", () => {
		const a = analyzeTerrain(
			track((km) => (km < 2 ? km * 50 : km < 6 ? 100 : km < 8 ? 100 + (km - 6) * 50 : 200)),
		);
		expect(a.climbs).toHaveLength(2);
		expect(summarizeTerrain(a, 2, 6).distances.flat).toBeCloseTo(4);
	});
	test("altitude gaps and sparse tracks are unknown, not flat", () => {
		const points = track((km) => km * 50);
		points[30].e = NaN;
		const s = summarizeTerrain(analyzeTerrain(points), 0, 4);
		expect(s.gainM).toBeNull();
		expect(analyzeTerrain(points).climbs).toHaveLength(0);
		expect(s.distances.unknown).toBeGreaterThan(0);
		const sparse = analyzeTerrain([points[0], points[100]]);
		expect(summarizeTerrain(sparse, 0, 5).distances.unknown).toBe(5);
		expect(sparse.climbs).toHaveLength(0);
	});
	test("a missing altitude between grid samples is preserved", () => {
		const points = track(() => 100, 1, 10);
		points[22].e = NaN;
		expect(summarizeTerrain(analyzeTerrain(points), 0, 1).gainM).toBeNull();
	});
	test("clips both boundaries and conserves distance", () => {
		const a = analyzeTerrain(track((km) => (km < 5 ? 100 : 100 + (km - 5) * 30)));
		const s = summarizeTerrain(a, 2.13, 6.27);
		expect(s.gainM).toBe(38);
		expect(s.segments[0].startKm).toBe(2.13);
		expect(s.segments.at(-1)?.endKm).toBe(6.27);
		expect(Object.values(s.distances).reduce((sum, d) => sum + d!, 0)).toBeCloseTo(4.14);
		expect(summarizeTerrain(a, 9, 11).gainM).toBeNull();
		expect(() => summarizeTerrain(a, 3, 2)).toThrow();
	});
	test("sample density does not change a monotonic climb", () => {
		const dense = analyzeTerrain(track((km) => km * 40, 10, 10));
		const sparse = analyzeTerrain(track((km) => km * 40, 10, 100));
		expect(dense.climbs).toEqual(sparse.climbs);
		expect(summarizeTerrain(dense, 1, 8).gainM).toBe(280);
	});
	test("isolated elevation spikes do not become climbs", () => {
		const points = track(() => 100);
		points[50].e = 1000;
		const a = analyzeTerrain(points);
		expect(a.climbs).toHaveLength(0);
		expect(summarizeTerrain(a, 0, 10).gainM).toBe(0);
	});
});
