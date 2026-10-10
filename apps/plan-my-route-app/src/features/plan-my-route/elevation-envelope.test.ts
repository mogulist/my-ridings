import { expect, test } from "bun:test";
import { buildElevationEnvelope } from "./elevation-envelope";
test("preserves a peak and valley between display bins", () => {
	const t = [
		{ x: 127, y: 37, d: 0, e: 100 },
		{ x: 127, y: 37, d: 100, e: 180 },
		{ x: 127, y: 37, d: 200, e: 80 },
		{ x: 127, y: 37, d: 300, e: 100 },
	];
	const b = buildElevationEnvelope(t, 0, 0.3, 1)[0];
	expect(b.minM).toBe(80);
	expect(b.maxM).toBe(180);
});
test("interpolates clipping boundaries and respects missing altitude", () => {
	const t = [
		{ x: 127, y: 37, d: 0, e: 100 },
		{ x: 127, y: 37, d: 400, e: 140 },
	];
	expect(buildElevationEnvelope(t, 0.1, 0.3, 1)[0].minM).toBe(110);
	expect(buildElevationEnvelope(t, 0.1, 0.3, 1)[0].maxM).toBe(130);
	expect(buildElevationEnvelope([{ ...t[0], e: undefined }, t[1]], 0.1, 0.3, 1)[0].minM).toBeNull();
	expect(
		buildElevationEnvelope([{ ...t[0] }, { ...t[1], d: 1000 }], 0.1, 0.3, 1)[0].minM,
	).toBeNull();
});
test("invalid and empty ranges do not invent elevations", () => {
	expect(buildElevationEnvelope([], 0, 1, 2).every((b) => b.minM == null)).toBe(true);
	expect(buildElevationEnvelope([], 1, 1)).toEqual([]);
});
