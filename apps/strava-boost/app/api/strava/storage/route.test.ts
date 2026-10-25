import { afterEach, expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import * as store from "@/lib/server/strava-store";
import { DELETE, GET, PUT } from "./route";

const mocks: Array<{ mockRestore(): void }> = [];
afterEach(() => {
	for (const mock of mocks) mock.mockRestore();
	mocks.length = 0;
});
function setup() {
	const operations: unknown[][] = [];
	let fail = false;
	const query = {
		select: (...args: unknown[]) => {
			operations.push(["select", ...args]);
			return query;
		},
		eq: (...args: unknown[]) => {
			operations.push(["eq", ...args]);
			return query;
		},
		gt: (...args: unknown[]) => {
			operations.push(["gt", ...args]);
			return query;
		},
		order: () => query,
		limit: () => query,
		upsert: (...args: unknown[]) => {
			operations.push(["upsert", ...args]);
			return query;
		},
		delete: () => {
			operations.push(["delete"]);
			return query;
		},
		maybeSingle: async () => ({ data: { last_sync_at: 100 }, error: fail ? {} : null }),
		// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
		then: (resolve: (value: unknown) => void) =>
			resolve({ data: [{ activity_id: 5, data: { id: 5 } }], error: fail ? {} : null }),
	};
	mocks.push(spyOn(store, "databaseConfigured").mockReturnValue(true));
	mocks.push(
		spyOn(store, "stravaStore").mockImplementation(
			() =>
				({
					from: (table: string) => {
						operations.push(["from", table]);
						return query;
					},
				}) as unknown as ReturnType<typeof store.stravaStore>,
		),
	);
	const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async () =>
		Response.json({ id: 42 }),
	);
	mocks.push(fetchMock);
	return {
		operations,
		fetchMock,
		fail: () => {
			fail = true;
		},
	};
}
function request(method = "GET", body?: unknown, search = "") {
	return new NextRequest(`https://boost.example/api/strava/storage${search}`, {
		method,
		headers: { authorization: "Bearer strava-token", origin: "https://boost.example" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}
const activity = { id: 5, athlete: { id: 42 }, type: "Ride", start_date_local: "2026-10-25" };

test("cloud reads ignore caller owner IDs and scope activities and metadata to Strava identity", async () => {
	const mock = setup();
	const response = await GET(request("GET", undefined, "?owner_id=999&after=3"));
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		enabled: true,
		activities: [{ id: 5 }],
		lastSyncAt: 100,
	});
	expect(mock.operations.filter((op) => op[0] === "eq")).toEqual([
		["eq", "owner_id", 42],
		["eq", "owner_id", 42],
	]);
	expect(mock.operations).toContainEqual(["gt", "activity_id", 3]);
	expect(response.headers.get("cache-control")).toBe("no-store");
});
test("writes derive composite owner key from Strava and advance checkpoint only for completion", async () => {
	const mock = setup();
	expect((await PUT(request("PUT", { activities: [activity], owner_id: 999 }))).status).toBe(200);
	expect(mock.operations).toContainEqual([
		"upsert",
		[{ owner_id: 42, activity_id: 5, data: activity }],
		{ onConflict: "owner_id,activity_id" },
	]);
	expect(mock.operations).not.toContainEqual(["from", "sync_state"]);
	const completed = await PUT(request("PUT", { activities: [], complete: true }));
	expect((await completed.json()).lastSyncAt).toBeGreaterThan(0);
	expect(mock.operations).toContainEqual(["from", "sync_state"]);
});
test("failed writes do not advance checkpoint or claim success", async () => {
	const mock = setup();
	mock.fail();
	expect((await PUT(request("PUT", { activities: [activity], complete: true }))).status).toBe(503);
	expect(mock.operations).not.toContainEqual(["from", "sync_state"]);
});
test("invalid identity, foreign activity owner, malformed and oversized batches cannot write", async () => {
	const mock = setup();
	expect(
		(await PUT(request("PUT", { activities: [{ ...activity, athlete: { id: 999 } }] }))).status,
	).toBe(400);
	expect((await PUT(request("PUT", { activities: Array(201).fill(activity) }))).status).toBe(400);
	expect((await PUT(request("PUT", null))).status).toBe(400);
	expect((await GET(request("GET", undefined, "?after=-1"))).status).toBe(400);
	mock.fetchMock.mockResolvedValue(Response.json({ id: -1 }));
	expect((await GET(request())).status).toBe(502);
	expect(mock.operations).toHaveLength(0);
});
test("missing and rejected tokens cannot access the store", async () => {
	const mock = setup();
	expect((await GET(new NextRequest("https://boost.example/api/strava/storage"))).status).toBe(401);
	mock.fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
	expect((await GET(request())).status).toBe(401);
	expect(mock.operations).toHaveLength(0);
});
test("mutations reject foreign origins and delete is always owner scoped", async () => {
	const mock = setup();
	expect(
		(
			await PUT(
				new NextRequest("https://boost.example/api/strava/storage", {
					method: "PUT",
					headers: { origin: "https://other.example" },
				}),
			)
		).status,
	).toBe(403);
	expect((await DELETE(request("DELETE", undefined, "?id=5&owner_id=999"))).status).toBe(200);
	expect(mock.operations).toContainEqual(["eq", "owner_id", 42]);
	expect(mock.operations).toContainEqual(["eq", "activity_id", 5]);
});
test("unconfigured storage explicitly preserves legacy mode without accessing Strava or DB", async () => {
	const mock = setup();
	mocks.push(spyOn(store, "databaseConfigured").mockReturnValue(false));
	expect(await (await GET(request())).json()).toEqual({ enabled: false });
	expect(mock.fetchMock).not.toHaveBeenCalled();
	expect(mock.operations).toHaveLength(0);
});
