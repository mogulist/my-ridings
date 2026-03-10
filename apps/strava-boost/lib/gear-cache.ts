"use client";

import { dbUtils } from "./indexeddb";
import { stravaApi } from "./strava-api";

type GearInfo = {
	id: string;
	name: string;
};

// 메모리 캐시 (세션 내 빠른 접근용)
const gearMemoryCache = new Map<string, GearInfo>();

export const getGearInfo = async (gearId: string): Promise<GearInfo | null> => {
	// 1. 메모리 캐시 확인
	if (gearMemoryCache.has(gearId)) {
		return gearMemoryCache.get(gearId) || null;
	}

	// 2. IndexedDB 확인
	try {
		const cachedGear = await dbUtils.getGear(gearId);
		if (cachedGear) {
			gearMemoryCache.set(gearId, cachedGear);
			return cachedGear;
		}
	} catch (error) {
		console.warn("Gear info load from DB failed:", error);
	}

	// 3. API에서 가져오기
	try {
		const gearInfo = await stravaApi.getGear(gearId);
		if (gearInfo) {
			// 4. 저장 (메모리 + DB)
			gearMemoryCache.set(gearId, gearInfo);
			await dbUtils.saveGear(gearInfo);
			return gearInfo;
		}
	} catch (error) {
		console.error("Gear info fetch failed:", error);
	}

	return null;
};

export const getGearInfos = async (gearIds: string[]): Promise<Map<string, GearInfo>> => {
	const uniqueGearIds = Array.from(new Set(gearIds));
	const gearMap = new Map<string, GearInfo>();

	// API 호출이 필요한 ID들만 필터링
	const idsToFetch: string[] = [];

	// 1. 로컬(메모리 -> DB)에서 먼저 조회
	await Promise.all(
		uniqueGearIds.map(async (gearId) => {
			// 메모리 확인
			if (gearMemoryCache.has(gearId)) {
				gearMap.set(gearId, gearMemoryCache.get(gearId)!);
				return;
			}

			// DB 확인
			try {
				const cachedGear = await dbUtils.getGear(gearId);
				if (cachedGear) {
					gearMemoryCache.set(gearId, cachedGear);
					gearMap.set(gearId, cachedGear);
					return;
				}
			} catch (e) {
				// DB 오류 무시하고 fetch 목록에 추가
			}

			idsToFetch.push(gearId);
		}),
	);

	// 2. 없는 데이터만 API 호출 (배치 처리)
	if (idsToFetch.length > 0) {
		const batchSize = 10;
		for (let i = 0; i < idsToFetch.length; i += batchSize) {
			const batch = idsToFetch.slice(i, i + batchSize);
			const promises = batch.map(async (gearId) => {
				try {
					const info = await stravaApi.getGear(gearId);
					if (info) {
						gearMap.set(gearId, info);
						gearMemoryCache.set(gearId, info);
						await dbUtils.saveGear(info);
					}
				} catch (error) {
					console.error(`Failed to fetch gear ${gearId}`, error);
				}
			});

			await Promise.all(promises);

			// Rate limit 방지를 위한 짧은 대기
			if (i + batchSize < idsToFetch.length) {
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		}
	}

	return gearMap;
};
