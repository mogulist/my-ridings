import { expect, test } from "bun:test";
import type { StravaActivity } from "@/types/strava";
import {
	assignmentFor,
	configurationAt,
	emptyGarage,
	type Garage,
	partDistance,
	partPeriods,
	serviceStatus,
	validateConfiguration,
	validateGarage,
} from "./equipment";

function fixture(): Garage {
	const g = emptyGarage();
	g.bikes = [
		{ id: "a", name: "A", stravaGearId: "b1" },
		{ id: "b", name: "B", stravaGearId: "b2" },
	];
	g.parts = [
		{
			id: "t1",
			name: "동일 모델 01",
			kind: "tire",
			startedAt: "2026-01-01T00:00:00Z",
			initialKm: 500,
			retiredAt: null,
		},
		{
			id: "t2",
			name: "동일 모델 02",
			kind: "tire",
			startedAt: "2026-02-01T00:00:00Z",
			initialKm: 0,
			retiredAt: null,
		},
		{
			id: "c1",
			name: "체인",
			kind: "chain",
			startedAt: "2026-01-01T00:00:00Z",
			initialKm: 1000,
			retiredAt: null,
		},
	];
	g.installations = [
		{
			id: "i1",
			bikeId: "a",
			at: "2026-02-01T00:00:00Z",
			parts: { tire_front: "t1", tire_rear: "t2", chain: "c1" },
		},
	];
	return g;
}
function ride(
	id: number,
	date: string,
	distance = 100000,
	gear = "b1",
	trainer = false,
): StravaActivity {
	return {
		id,
		name: "테스트",
		distance,
		gear_id: gear,
		start_date: date,
		start_date_local: date,
		type: "Ride",
		trainer,
		moving_time: 1,
		elapsed_time: 1,
		average_speed: 1,
		max_speed: 1,
	};
}
test("same-model tires have independent age and initial mileage", () => {
	const g = fixture(),
		a = [ride(1, "2026-02-02T00:00:00Z")];
	expect(partDistance(g, a, "t1")).toBe(600);
	expect(partDistance(g, a, "t2")).toBe(100);
});
test("late uploads use riding time and installation history, never today's configuration", () => {
	const g = fixture();
	g.installations.push({
		id: "i2",
		bikeId: "a",
		at: "2026-03-01T00:00:00Z",
		parts: { chain: "c1" },
	});
	expect(
		partDistance(g, [ride(1, "2026-02-10T00:00:00Z"), ride(2, "2026-03-02T00:00:00Z")], "t2"),
	).toBe(100);
	expect(configurationAt(g, "a", "2026-01-02T00:00:00Z")).toEqual({});
});
test("confirmed ride survives preset, current installation, and Strava gear changes", () => {
	const g = fixture();
	g.assignments = [{ activityId: 1, bikeId: "a", parts: { tire_front: "t1" } }];
	g.installations = [];
	const activity = ride(1, "2026-04-01T00:00:00Z", 100000, "b2");
	expect(assignmentFor(g, activity)?.bikeId).toBe("a");
	expect(partDistance(g, [activity], "t1")).toBe(600);
});
test("indoor trainer counts chain and cassette, excludes tires and wheels", () => {
	const g = fixture(),
		activities = [ride(1, "2026-02-10T00:00:00Z", 100000, "b1", true)];
	expect(partDistance(g, activities, "t2")).toBe(0);
	expect(partDistance(g, activities, "c1")).toBe(1100);
});
test("activity correction and deletion recalculate usage without accumulated drift", () => {
	const g = fixture();
	expect(partDistance(g, [ride(1, "2026-02-02T00:00:00Z", 50000)], "t2")).toBe(50);
	expect(partDistance(g, [ride(1, "2026-02-02T00:00:00Z", 25000)], "t2")).toBe(25);
	expect(partDistance(g, [], "t2")).toBe(0);
});
test("duplicate component and incompatible slots are rejected", () => {
	const g = fixture();
	expect(() => validateConfiguration(g, { tire_front: "t1", tire_rear: "t1" })).toThrow("두 위치");
	expect(() => validateConfiguration(g, { wheelset: "t1" })).toThrow("종류");
	expect(() => validateConfiguration(g, { tire_front: "t2" }, "2026-01-02T00:00:00Z")).toThrow(
		"사용 기간",
	);
	expect(() => validateConfiguration(g, { constructor: "t1" } as never)).toThrow("위치");
});
test("bike handoff preserves total use, and overlapping installation is blocked", () => {
	const g = fixture();
	g.installations.push({
		id: "i2",
		bikeId: "b",
		at: "2026-03-01T00:00:00Z",
		parts: { tire_front: "t1" },
	});
	expect(() => validateGarage(g)).toThrow("여러 자전거");
	g.installations.push({
		id: "i3",
		bikeId: "a",
		at: "2026-03-01T00:00:00Z",
		parts: { chain: "c1" },
	});
	expect(() => validateGarage(g)).not.toThrow();
	expect(
		partDistance(
			g,
			[ride(1, "2026-02-10T00:00:00Z"), ride(2, "2026-03-10T00:00:00Z", 100000, "b2")],
			"t1",
		),
	).toBe(700);
});
test("service resets its counter while keeping lifetime distance; either threshold can trigger", () => {
	const g = fixture();
	const r = { id: "wax", targetId: "c1", name: "왁싱", km: 300, days: 10 };
	g.rules = [r];
	g.services = [{ id: "s1", ruleId: r.id, at: "2026-02-05T00:00:00Z", note: "" }];
	const activities = [ride(1, "2026-02-02T00:00:00Z"), ride(2, "2026-02-07T00:00:00Z")];
	expect(serviceStatus(g, activities, r, Date.parse("2026-02-08T00:00:00Z"))).toMatchObject({
		km: 100,
		days: 3,
		state: "ok",
	});
	expect(serviceStatus(g, activities, r, Date.parse("2026-02-16T00:00:00Z")).state).toBe("due");
	expect(
		serviceStatus(g, activities, { ...r, km: 80 }, Date.parse("2026-02-08T00:00:00Z")).state,
	).toBe("due");
	expect(partDistance(g, activities, "c1")).toBe(1200);
});
test("no service baseline stays unknown and invalid rule references are rejected", () => {
	const g = fixture();
	const r = { id: "wax", targetId: "c1", name: "왁싱", km: 300, days: null };
	expect(serviceStatus(g, [], r).state).toBe("unknown");
	g.rules = [{ ...r, targetId: "someone-elses-part" }];
	expect(() => validateGarage(g)).toThrow("대상");
});
test("retirement excludes rides after removal and requires detaching first", () => {
	const g = fixture();
	g.parts[0].retiredAt = "2026-03-01T00:00:00Z";
	expect(() => validateGarage(g)).toThrow("분리");
	g.installations.push({ id: "i2", bikeId: "a", at: "2026-03-01T00:00:00Z", parts: {} });
	expect(() => validateGarage(g)).not.toThrow();
	expect(
		partDistance(g, [ride(1, "2026-02-10T00:00:00Z"), ride(2, "2026-03-10T00:00:00Z")], "t1"),
	).toBe(600);
});

test("mounted duration excludes storage and follows a component between bikes", () => {
	const g = fixture();
	g.installations.push({ id: "remove", bikeId: "a", at: "2026-02-10T00:00:00Z", parts: {} });
	g.installations.push({
		id: "reinstall",
		bikeId: "b",
		at: "2026-02-20T00:00:00Z",
		parts: { tire_front: "t1" },
	});
	const windows = partPeriods(g, "t1", Date.parse("2026-02-25T00:00:00Z"));
	expect(windows).toHaveLength(2);
	expect(windows.reduce((sum, p) => sum + p.end - p.start, 0) / 86400000).toBe(14);
	expect(windows[0].bikeId).toBe("b");
});

test("virtual rides without a trainer flag still exclude tires and count the drivetrain", () => {
	const g = fixture();
	const activities = [
		{ ...ride(1, "2026-02-02T00:00:00Z"), sport_type: "VirtualRide", trainer: undefined },
	];
	expect(partDistance(g, activities, "t2")).toBe(0);
	expect(partDistance(g, activities, "c1")).toBe(1100);
});
