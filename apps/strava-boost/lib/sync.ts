"use client";

import type { StravaActivity } from "@/src/types";
import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";
import { isSupabaseConfigured, supabase } from "./supabase";

export type SyncProgress = {
	status: "idle" | "syncing" | "success" | "error";
	current: number;
	total: number | null;
	message: string;
	error?: string;
};

type SyncCallbacks = {
	onProgress?: (progress: SyncProgress) => void;
};

type SyncOptions = {
	forceFullSync?: boolean;
};

export const syncActivities = async (
	callbacks?: SyncCallbacks,
	options?: SyncOptions,
): Promise<{ count: number; isIncremental: boolean }> => {
	const updateProgress = (progress: Partial<SyncProgress>) => {
		if (callbacks?.onProgress) {
			callbacks.onProgress({
				status: "syncing",
				current: 0,
				total: null,
				message: "",
				...progress,
			} as SyncProgress);
		}
	};

	try {
		updateProgress({
			status: "syncing",
			message: "동기화 준비 중...",
		});

		// 마지막 동기화 시간 확인
		let lastSyncAt = await dbUtils.getLastSyncAt();

		// 전체 동기화 강제 옵션
		if (options?.forceFullSync) {
			lastSyncAt = null;
		}

		const isIncremental = lastSyncAt !== null;

		updateProgress({
			message: isIncremental ? "새로운 활동을 가져오는 중..." : "전체 활동을 가져오는 중...",
		});

		// Strava API에서 활동 가져오기
		const activities = await stravaApi.getActivities(
			isIncremental && lastSyncAt !== null ? { after: lastSyncAt } : undefined,
		);

		if (activities.length === 0) {
			updateProgress({
				status: "success",
				message: "새로운 활동이 없습니다.",
			});
			return { count: 0, isIncremental };
		}

		updateProgress({
			current: 0,
			total: activities.length,
			message: `${activities.length}개의 활동을 저장하는 중...`,
		});

		// IndexedDB에 저장
		await dbUtils.saveActivities(activities);

		// 동기화 시간 업데이트
		const syncTimestamp = Math.floor(Date.now() / 1000);
		await dbUtils.saveLastSyncAt(syncTimestamp);

		// Supabase에 동기화 시간 업데이트 (설정된 경우)
		if (isSupabaseConfigured()) {
			const tokens = await dbUtils.getTokens();
			if (tokens) {
				await supabase.from("users").upsert(
					{
						strava_id: tokens.athleteId,
						last_sync_at: new Date(syncTimestamp * 1000).toISOString(),
						updated_at: new Date().toISOString(),
					},
					{
						onConflict: "strava_id",
					},
				);
			}
		}

		updateProgress({
			status: "success",
			current: activities.length,
			total: activities.length,
			message: `${activities.length}개의 활동이 동기화되었습니다.`,
		});

		return { count: activities.length, isIncremental };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다.";

		updateProgress({
			status: "error",
			message: errorMessage,
			error: errorMessage,
		});

		throw error;
	}
};

export const getStoredActivities = async (): Promise<StravaActivity[]> => {
	return await dbUtils.getAllActivities();
};

export const getLastSyncTime = async (): Promise<Date | null> => {
	const timestamp = await dbUtils.getLastSyncAt();
	return timestamp ? new Date(timestamp * 1000) : null;
};
