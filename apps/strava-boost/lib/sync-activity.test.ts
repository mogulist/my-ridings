import { afterEach, expect, spyOn, test } from "bun:test";
import * as storage from "./activity-storage";
import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";
import { ACTIVITY_CHANGED, syncActivity, syncActivities } from "./sync";
import type { StravaActivity } from "../types/strava";

const originalWindow = globalThis.window;
const mocks: Array<{ mockRestore(): void }> = [];
afterEach(() => {
	mocks.forEach((mock) => mock.mockRestore());
	mocks.length = 0;
	globalThis.window = originalWindow;
});

function setup() {
	const activity = { id: 123, name: "수정된 제목", type: "Ride", private: true } as StravaActivity;
	const streams = { activityId: 123, altitude: [100], distance: [0], time: [0], latlng: [] };
	const events: Event[] = [];
	globalThis.window = {
		dispatchEvent: (event: Event) => {
			events.push(event);
			return true;
		},
	} as unknown as Window & typeof globalThis;
	const get = spyOn(stravaApi, "getActivity").mockResolvedValue(activity);
	const invalidate = spyOn(dbUtils, "invalidateStreams").mockResolvedValue();
	const save = spyOn(dbUtils, "saveActivities").mockResolvedValue();
	const fetchStreams = spyOn(stravaApi, "getActivityStreams").mockResolvedValue(streams);
	const saveStreams = spyOn(dbUtils, "saveStreams").mockResolvedValue();
	mocks.push(
		spyOn(storage, "persistActivities").mockResolvedValue(),
		get,
		invalidate,
		save,
		fetchStreams,
		saveStreams,
	);
	return { activity, streams, get, invalidate, save, fetchStreams, saveStreams, events };
}

test("manual refresh fetches one activity and replaces cached streams", async () => {
	const mock = setup();
	expect(await syncActivity(123, true)).toBe(mock.activity);
	expect(mock.get).toHaveBeenCalledWith(123);
	expect(mock.invalidate).toHaveBeenCalledWith(123);
	expect(mock.save).toHaveBeenCalledWith([mock.activity]);
	expect(mock.saveStreams).toHaveBeenCalledWith(mock.streams);
	expect(mock.events[0].type).toBe(ACTIVITY_CHANGED);
});

test("failed detail lookup leaves the saved activity and geometry intact", async () => {
	const mock = setup();
	mock.get.mockRejectedValue(new Error("rate limit"));
	await expect(syncActivity(123, true)).rejects.toThrow("rate limit");
	expect(mock.invalidate).not.toHaveBeenCalled();
	expect(mock.save).not.toHaveBeenCalled();
	expect(mock.events).toHaveLength(0);
});

test("stream failure still notifies views after metadata changed and old streams were invalidated", async () => {
	const mock = setup();
	mock.fetchStreams.mockRejectedValue(new Error("streams unavailable"));
	await expect(syncActivity(123, true)).rejects.toThrow("streams unavailable");
	expect(mock.save).toHaveBeenCalledWith([mock.activity]);
	expect(mock.invalidate).toHaveBeenCalledWith(123);
	expect(mock.saveStreams).not.toHaveBeenCalled();
	expect(mock.events).toHaveLength(1);
});

test("a failed cloud upload never updates the local sync checkpoint", async () => {
	const get = spyOn(stravaApi, "getActivities").mockResolvedValue([{ id: 1 }] as StravaActivity[]);
	const stamp = spyOn(storage, "storedSyncTimestamp").mockResolvedValue(null);
	const persist = spyOn(storage, "persistActivities").mockRejectedValue(
		new Error("DB unavailable"),
	);
	const save = spyOn(dbUtils, "saveActivities").mockResolvedValue();
	const checkpoint = spyOn(dbUtils, "saveLastSyncAt").mockResolvedValue();
	mocks.push(get, stamp, persist, save, checkpoint);
	await expect(syncActivities()).rejects.toThrow("DB unavailable");
	expect(checkpoint).not.toHaveBeenCalled();
	expect(save).not.toHaveBeenCalled();
});

test("an empty first sync persists completion, and forced full sync ignores cloud checkpoint", async () => {
	const get = spyOn(stravaApi, "getActivities").mockResolvedValue([]);
	const stamp = spyOn(storage, "storedSyncTimestamp").mockResolvedValue(100);
	const persist = spyOn(storage, "persistActivities").mockResolvedValue();
	const checkpoint = spyOn(dbUtils, "saveLastSyncAt").mockResolvedValue();
	mocks.push(get, stamp, persist, checkpoint);
	expect(await syncActivities(undefined, { forceFullSync: true })).toEqual({
		count: 0,
		isIncremental: false,
	});
	expect(get).toHaveBeenCalledWith(undefined);
	expect(persist).toHaveBeenCalledWith([], true);
	expect(checkpoint).toHaveBeenCalled();
});
