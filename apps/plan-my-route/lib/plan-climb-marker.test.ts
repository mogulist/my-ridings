import { expect, test } from "bun:test";
import { parsePlanClimbMarker, markerOnTrack } from "./plan-climb-marker";
test("rejects missing/invalid input before database writes", () => {
	for (const value of [
		null,
		[],
		{},
		{ name: "", distanceM: 10 },
		{ name: "고개", distanceM: -1 },
		{ name: "고개", distanceM: "10" },
		{ name: "고개", distanceM: NaN },
		{ name: "고개", distanceM: 10, summitId: "invalid" },
	])
		expect(parsePlanClimbMarker(value)).toBeNull();
});
test("normalizes stable registration distance and names", () => {
	expect(parsePlanClimbMarker({ name: " 고개 ", distanceM: 10002 })).toEqual({
		name: "고개",
		distance_m: 10000,
		summit_id: null,
	});
});
test("maps a plan summit to returned track distance, without trusting stale indices", () => {
	expect(
		markerOnTrack({ id: "p", name: "고개", distance_m: 600, summit_id: null }, [
			{ d: 0, e: 1 },
			{ d: 500, e: 10 },
			{ d: 1000, e: 5 },
		])?.trackPointIndex,
	).toBe(1);
	expect(markerOnTrack({ id: "p", name: "고개", distance_m: 10, summit_id: null }, [])).toBeNull();
});
