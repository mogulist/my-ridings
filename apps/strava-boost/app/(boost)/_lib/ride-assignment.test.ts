import { expect, test } from "bun:test";
import { emptyGarage, type Garage, type Preset } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";
import { assignPresetToRides } from "./ride-assignment";

function fixture() {
	const garage: Garage = emptyGarage();
	garage.bikes = [{ id: "bike", name: "자전거", stravaGearId: null }];
	garage.parts = [
		{
			id: "wheel",
			name: "휠셋",
			kind: "wheelset",
			startedAt: "2025-01-01T00:00:00Z",
			initialKm: 0,
			retiredAt: null,
		},
	];
	const preset: Preset = { id: "road", bikeId: "bike", name: "로드", parts: { wheelset: "wheel" } };
	garage.presets = [preset];
	garage.assignments = [
		{ activityId: 1, bikeId: "bike", parts: {} },
		{ activityId: 3, bikeId: "bike", parts: {} },
	];
	const ride = (id: number, date = "2026-01-01T00:00:00Z") =>
		({ id, name: `라이딩 ${id}`, type: "Ride", start_date: date }) as StravaActivity;
	return { garage, preset, ride };
}

test("selecting two rides replaces their assignments together and preserves all other records", () => {
	const { garage, preset, ride } = fixture();
	const original = structuredClone(garage);

	const next = assignPresetToRides(garage, [ride(1), ride(2)], preset);

	expect(next.assignments).toEqual([
		{ activityId: 3, bikeId: "bike", parts: {} },
		{ activityId: 1, bikeId: "bike", parts: { wheelset: "wheel" } },
		{ activityId: 2, bikeId: "bike", parts: { wheelset: "wheel" } },
	]);
	expect(garage).toEqual(original);
	expect(next.installations).toBe(garage.installations);
	expect(next.presets).toBe(garage.presets);
});

test("if one selected ride predates a part, no ride assignment is changed and the error identifies that ride", () => {
	const { garage, preset, ride } = fixture();
	const original = structuredClone(garage);

	expect(() =>
		assignPresetToRides(garage, [ride(1), ride(2, "2024-12-31T00:00:00Z")], preset),
	).toThrow("라이딩 2: 부품 사용 기간 밖의 날짜입니다.");
	expect(garage).toEqual(original);
});

test("editing the saved combination later does not rewrite either assigned ride's parts", () => {
	const { garage, preset, ride } = fixture();
	const next = assignPresetToRides(garage, [ride(1), ride(2)], preset);

	preset.parts.wheelset = "another-wheel";
	next.assignments.find((item) => item.activityId === 1)!.parts.chain = "chain";

	expect(next.assignments.find((item) => item.activityId === 1)?.parts.wheelset).toBe("wheel");
	expect(next.assignments.find((item) => item.activityId === 2)?.parts).toEqual({
		wheelset: "wheel",
	});
});

test("a retired part is available for a ride before retirement but cannot be assigned on the retirement date", () => {
	const { garage, preset, ride } = fixture();
	garage.parts[0].retiredAt = "2026-01-02T00:00:00Z";

	expect(
		assignPresetToRides(garage, [ride(1)], preset).assignments.find((item) => item.activityId === 1)
			?.parts,
	).toEqual({ wheelset: "wheel" });
	expect(() => assignPresetToRides(garage, [ride(2, "2026-01-02T00:00:00Z")], preset)).toThrow(
		"부품 사용 기간 밖의 날짜",
	);
});
