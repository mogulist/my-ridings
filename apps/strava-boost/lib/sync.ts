"use client";

import type { StravaActivity } from "@/types/strava";
import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";
import { persistActivities, storedActivities, storedSyncTimestamp } from "./activity-storage";

const defaultSyncLookbackWeeks = 4;
const msPerWeek = 7 * 24 * 60 * 60 * 1000;

const getLookbackAfterTimestamp = (weeks = defaultSyncLookbackWeeks): number => {
	return Math.floor((Date.now() - weeks * msPerWeek) / 1000);
};

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
		let lastSyncAt = await storedSyncTimestamp();

		// 전체 동기화 강제 옵션
		if (options?.forceFullSync) {
			lastSyncAt = null;
		}

		const isIncremental = lastSyncAt !== null;

		updateProgress({
			message: isIncremental
				? `최근 ${defaultSyncLookbackWeeks}주 활동을 가져오는 중...`
				: "전체 활동을 가져오는 중...",
		});

		// Strava API에서 활동 가져오기
		// 증분 동기화: 마지막 동기화 시각 대신 lookback 기간 사용 (뒤늦게 업로드된 활동 포함)
		const activities = await stravaApi.getActivities(
			isIncremental ? { after: getLookbackAfterTimestamp() } : undefined,
		);

		if (activities.length === 0) {
			await persistActivities([], true);
			await dbUtils.saveLastSyncAt(Math.floor(Date.now() / 1000));
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

		await persistActivities(activities, true);

		// IndexedDB에 저장
		await dbUtils.saveActivities(activities);

		// 동기화 시간 업데이트
		const syncTimestamp = Math.floor(Date.now() / 1000);
		await dbUtils.saveLastSyncAt(syncTimestamp);

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
	return storedActivities();
};

export const getLastSyncTime = async (): Promise<Date | null> => {
	const timestamp = await storedSyncTimestamp();
	return timestamp ? new Date(timestamp * 1000) : null;
};

export const ACTIVITY_CHANGED = "strava:activity-changed";

export const syncActivity = async (id: number, refreshStreams = false): Promise<StravaActivity> => {
	const activity = await stravaApi.getActivity(id);
	await persistActivities([activity]);
	// Invalidate before fetching: a failed streams request must not leave old geometry cached.
	await dbUtils.invalidateStreams(id);
	await dbUtils.saveActivities([activity]);
	try {
		if (refreshStreams) {
			const streams = await stravaApi.getActivityStreams(id);
			await dbUtils.saveStreams(streams);
		}
	} finally {
		window.dispatchEvent(new CustomEvent(ACTIVITY_CHANGED, { detail: id }));
	}
	return activity;
};
