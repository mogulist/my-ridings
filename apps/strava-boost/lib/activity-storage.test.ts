import { afterEach, expect, spyOn, test } from "bun:test";
import type { StravaActivity } from "@/types/strava";
import { persistActivities, storedActivities, storedSyncTimestamp } from "./activity-storage";
import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";

const mocks: Array<{ mockRestore(): void }> = [];
afterEach(() => {
	for (const mock of mocks) mock.mockRestore();
	mocks.length = 0;
});
function setup() {
	mocks.push(spyOn(stravaApi, "getAccessToken").mockResolvedValue("token"));
	mocks.push(
		spyOn(dbUtils, "getTokens").mockResolvedValue({
			athleteId: 42,
			accessToken: "token",
			refreshToken: "refresh",
			expiresAt: 9999999999,
		}),
	);
	mocks.push(spyOn(dbUtils, "prepareAccountCache").mockResolvedValue());
	const save = spyOn(dbUtils, "saveActivities").mockResolvedValue();
	const clear = spyOn(dbUtils, "clearActivities").mockResolvedValue();
	mocks.push(save, clear);
	return { save, clear };
}
test("all server pages replace the disposable cache only after a successful complete read", async () => {
	const mock = setup();
	const fetchMock = spyOn(globalThis, "fetch")
		.mockResolvedValueOnce(Response.json({ enabled: true, activities: [{ id: 1 }], next: 1 }))
		.mockResolvedValueOnce(Response.json({ enabled: true, activities: [{ id: 2 }], next: null }));
	mocks.push(fetchMock);
	expect(await storedActivities()).toEqual([{ id: 1 }, { id: 2 }]);
	expect(fetchMock.mock.calls[1][0]).toBe("/api/strava/storage?after=1");
	expect(mock.save).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
});
test("cloud errors are surfaced and never silently read stale local activities", async () => {
	const mock = setup();
	mocks.push(
		spyOn(globalThis, "fetch").mockResolvedValue(
			Response.json({ error: "DB unavailable" }, { status: 503 }),
		),
	);
	await expect(storedActivities()).rejects.toThrow("DB unavailable");
	expect(mock.clear).not.toHaveBeenCalled();
	expect(mock.save).not.toHaveBeenCalled();
});
test("multi-batch upload advances checkpoint only in the last batch and stops on failure", async () => {
	setup();
	const bodies: { activities: unknown[]; complete: boolean }[] = [];
	const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
		bodies.push(JSON.parse(String(init?.body)));
		return Response.json({ enabled: true });
	});
	mocks.push(fetchMock);
	await persistActivities(
		Array.from({ length: 401 }, (_, id) => ({ id: id + 1 }) as StravaActivity),
		true,
	);
	expect(bodies.map((body) => [body.activities.length, body.complete])).toEqual([
		[200, false],
		[200, false],
		[1, true],
	]);
	fetchMock.mockResolvedValue(Response.json({ error: "failed" }, { status: 503 }));
	await expect(persistActivities([{ id: 1 }] as StravaActivity[], true)).rejects.toThrow("failed");
});
test("legacy mode reads IndexedDB only when the server explicitly reports unconfigured", async () => {
	setup();
	mocks.push(spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ enabled: false })));
	mocks.push(spyOn(dbUtils, "getLastSyncAt").mockResolvedValue(123));
	expect(await storedSyncTimestamp()).toBe(123);
});
