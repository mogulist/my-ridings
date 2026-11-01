"use client";
import { dbUtils } from "@/lib/indexeddb";
import { stravaApi } from "@/lib/strava-api";
export type CloudSession = { configured: boolean; athleteId: number | null };
export async function boostRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
	const tokens = await dbUtils.getTokens();
	const response = await fetch(`/api/boost/${path}`, {
		...init,
		cache: "no-store",
		signal: AbortSignal.timeout(30000),
		headers: {
			...(init.body ? { "Content-Type": "application/json" } : {}),
			...(tokens ? { Authorization: `Bearer ${await stravaApi.getAccessToken()}` } : {}),
			...init.headers,
		},
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error || "장비 기록을 불러오지 못했습니다.");
	return data;
}
export function cloudSession() {
	return boostRequest<CloudSession>("session");
}
