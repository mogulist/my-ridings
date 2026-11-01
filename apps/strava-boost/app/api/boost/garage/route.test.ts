import { afterEach, expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import { emptyGarage } from "@/lib/equipment";
import * as store from "@/lib/server/strava-store";
import * as garageServer from "./_lib/garage";
import { GET, PUT } from "./route";

const mocks: Array<{ mockRestore(): void }> = [];
afterEach(() => {
	for (const mock of mocks) mock.mockRestore();
	mocks.length = 0;
});
function setup() {
	const filters: unknown[][] = [];
	const writes: unknown[][] = [];
	let revision: number | null = 1;
	let rows = [{ activity_id: 5, data: { type: "Ride", start_date: "2026-01-02T00:00:00Z" } }];
	const previous = emptyGarage();
	const query = {
		select: () => query,
		eq: (...args: unknown[]) => {
			filters.push(args);
			return query;
		},
		in: async () => ({ data: rows, error: null }),
	};
	mocks.push(spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ id: 42 })));
	const read = spyOn(garageServer, "garageFor").mockImplementation(async () => ({
		garage: previous,
		revision: 0,
	}));
	mocks.push(read);
	mocks.push(
		spyOn(store, "stravaStore").mockImplementation(
			() =>
				({
					from: (table: string) => {
						filters.push(["table", table]);
						return query;
					},
					rpc: async (...args: unknown[]) => {
						writes.push(args);
						return { data: revision, error: null };
					},
				}) as unknown as ReturnType<typeof store.stravaStore>,
		),
	);
	return {
		filters,
		writes,
		read,
		previous,
		conflict: () => {
			revision = null;
		},
		noActivities: () => {
			rows = [];
		},
	};
}
const request = (body: unknown, origin = "https://boost.example") =>
	new NextRequest("https://boost.example/api/boost/garage?owner_id=999", {
		method: "PUT",
		headers: { authorization: "Bearer athlete-token", origin },
		body: JSON.stringify(body),
	});
function assignmentGarage() {
	return {
		...emptyGarage(),
		bikes: [{ id: "bike", name: "로드", stravaGearId: "b123" }],
		parts: [
			{
				id: "tire",
				name: "타이어 01",
				kind: "tire" as const,
				startedAt: "2026-01-01T00:00:00Z",
				initialKm: 0,
				retiredAt: null,
			},
		],
		assignments: [{ activityId: 5, bikeId: "bike", parts: { tire_front: "tire" } }],
	};
}

test("garage reads and writes derive owner from Strava, never browser IDs", async () => {
	const mock = setup();
	expect(
		(
			await GET(
				new NextRequest("https://boost.example/api/boost/garage?owner_id=999", {
					headers: { authorization: "Bearer token" },
				}),
			)
		).status,
	).toBe(200);
	expect(mock.read).toHaveBeenCalledWith(42);
	const garage = emptyGarage();
	expect((await PUT(request({ garage, revision: 0, owner_id: 999 }))).status).toBe(200);
	expect(mock.writes).toEqual([["save_garage", { p_owner: 42, p_revision: 0, p_state: garage }]]);
});
test("another device's revision is a conflict and never silently succeeds", async () => {
	const mock = setup();
	mock.conflict();
	expect((await PUT(request({ garage: emptyGarage(), revision: 0 }))).status).toBe(409);
});
test("missing authentication, cross-origin mutation and invalid revision do not write", async () => {
	const mock = setup();
	expect((await GET(new NextRequest("https://boost.example/api/boost/garage"))).status).toBe(401);
	expect(
		(await PUT(request({ garage: emptyGarage(), revision: 0 }, "https://other.example"))).status,
	).toBe(403);
	expect((await PUT(request({ garage: emptyGarage(), revision: -1 }))).status).toBe(400);
	expect(mock.writes).toHaveLength(0);
});
test("assignments query only this owner's imported activities", async () => {
	const mock = setup();
	expect((await PUT(request({ garage: assignmentGarage(), revision: 0 }))).status).toBe(200);
	expect(mock.filters).toContainEqual(["table", "activities"]);
	expect(mock.filters).toContainEqual(["owner_id", 42]);
	mock.noActivities();
	expect((await PUT(request({ garage: assignmentGarage(), revision: 1 }))).status).toBe(400);
});
test("component lifetime is checked against the actual ride date", async () => {
	const mock = setup();
	const garage = assignmentGarage();
	garage.parts[0].startedAt = "2026-02-01T00:00:00Z";
	expect((await PUT(request({ garage, revision: 0 }))).status).toBe(400);
	expect(mock.writes).toHaveLength(0);
});
test("unchanged assignment for a deleted activity remains historical, but cannot be edited", async () => {
	const mock = setup();
	const garage = assignmentGarage();
	mock.previous.assignments = garage.assignments;
	mock.noActivities();
	expect((await PUT(request({ garage, revision: 0 }))).status).toBe(200);
	garage.assignments = [{ activityId: 5, bikeId: "bike", parts: {} }];
	expect((await PUT(request({ garage, revision: 1 }))).status).toBe(400);
});
test("malformed documents and invalid references do not reach the database function", async () => {
	const mock = setup();
	expect(
		(await PUT(request({ garage: { ...emptyGarage(), bikes: [null] }, revision: 0 }))).status,
	).toBe(400);
	expect(
		(
			await PUT(
				request({
					garage: {
						...emptyGarage(),
						services: [{ id: "s", ruleId: "missing", at: "2026-01-01", note: "" }],
					},
					revision: 0,
				}),
			)
		).status,
	).toBe(400);
	expect(mock.writes).toHaveLength(0);
});
