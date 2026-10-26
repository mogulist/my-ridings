"use client";

import type { StravaActivity } from "@/types/strava";
import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";

type Page = {
	enabled: boolean;
	activities?: StravaActivity[];
	next?: number | null;
	lastSyncAt?: number | null;
};
async function request(path = "", init: RequestInit = {}): Promise<Page> {
	const response = await fetch(`/api/strava/storage${path}`, {
		...init,
		cache: "no-store",
		signal: AbortSignal.timeout(30000),
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await stravaApi.getAccessToken()}`,
		},
	});
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error || "활동 저장소에 연결하지 못했습니다.");
	}
	return response.json();
}

export async function storedActivities(): Promise<StravaActivity[]> {
	if (!(await dbUtils.getTokens())) return [];
	await dbUtils.prepareAccountCache();
	const activities: StravaActivity[] = [];
	let after = 0;
	do {
		const page = await request(`?after=${after}`);
		if (!page.enabled) return dbUtils.getAllActivities();
		activities.push(...page.activities!);
		after = page.next ?? 0;
	} while (after);
	// Detail pages and webhook updates continue to use IndexedDB as a disposable cache.
	await dbUtils.clearActivities();
	await dbUtils.saveActivities(activities);
	return activities;
}
export async function storedSyncTimestamp(): Promise<number | null> {
	if (!(await dbUtils.getTokens())) return null;
	await dbUtils.prepareAccountCache();
	const page = await request("?meta=1");
	return page.enabled ? (page.lastSyncAt ?? null) : dbUtils.getLastSyncAt();
}
export async function persistActivities(activities: StravaActivity[], complete = false) {
	// Empty complete batches are significant: even a new account with zero activities was synced.
	for (let start = 0; start < Math.max(activities.length, 1); start += 200) {
		await request("", {
			method: "PUT",
			body: JSON.stringify({
				activities: activities.slice(start, start + 200),
				complete: complete && start + 200 >= activities.length,
			}),
		});
	}
}
export async function deleteStoredActivity(id: number) {
	await request(`?id=${id}`, { method: "DELETE" });
	await dbUtils.deleteActivity(id);
}

export async function storedActivity(id: number): Promise<StravaActivity | null> {
	if (!(await dbUtils.getTokens())) return null;
	await dbUtils.prepareAccountCache();
	const page = await request(`?id=${id}`);
	if (!page.enabled) return dbUtils.getActivityById(id);
	const activity = page.activities?.[0] ?? null;
	if (activity) await dbUtils.saveActivities([activity]);
	return activity;
}
