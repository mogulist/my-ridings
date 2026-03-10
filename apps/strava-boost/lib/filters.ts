"use client";

import type { StravaActivity } from "@/src/types";

export type ActivityFilters = {
	sportTypes?: string[]; // 'EBikeRide', 'Ride', etc.
	bikeTypes?: string[]; // gear_id
	keyword?: string; // 검색 키워드 (활동 이름에 포함)
	indoorOnly?: boolean; // 인도어 라이딩만 표시
	trainerTypes?: string[]; // 트레이너/디바이스 이름
};

export const filterActivities = (
	activities: StravaActivity[],
	filters: ActivityFilters,
): StravaActivity[] => {
	return activities.filter((activity) => {
		// 스포츠 종목 필터
		if (filters.sportTypes && filters.sportTypes.length > 0) {
			if (!filters.sportTypes.includes(activity.type)) {
				return false;
			}
		}

		// 자전거 타입 필터
		if (filters.bikeTypes && filters.bikeTypes.length > 0) {
			if (!activity.gear_id || !filters.bikeTypes.includes(activity.gear_id)) {
				return false;
			}
		}

		// 키워드 필터 (대소문자 구분 없음)
		if (filters.keyword) {
			const keyword = filters.keyword.toLowerCase();
			const activityName = activity.name.toLowerCase();
			if (!activityName.includes(keyword)) {
				return false;
			}
		}

		// 인도어 라이딩 필터
		if (filters.indoorOnly && !activity.trainer) {
			return false;
		}

		// 트레이너 타입 필터
		if (filters.trainerTypes && filters.trainerTypes.length > 0) {
			if (!activity.device_name) {
				return false;
			}
			const deviceName = activity.device_name.toLowerCase();
			const hasMatch = filters.trainerTypes.some((trainerType) =>
				deviceName.includes(trainerType.toLowerCase()),
			);
			if (!hasMatch) {
				return false;
			}
		}

		return true;
	});
};

export const getUniqueSportTypes = (activities: StravaActivity[]): string[] => {
	const types = new Set<string>();
	activities.forEach((activity) => {
		types.add(activity.type);
	});
	return Array.from(types).sort();
};

export const getUniqueBikeTypes = (activities: StravaActivity[]): string[] => {
	const gearIds = new Set<string>();
	activities.forEach((activity) => {
		if (activity.gear_id) {
			gearIds.add(activity.gear_id);
		}
	});
	return Array.from(gearIds).sort();
};

export const getUniqueTrainerTypes = (activities: StravaActivity[]): string[] => {
	const trainerTypes = new Set<string>();
	activities.forEach((activity) => {
		if (activity.device_name) {
			trainerTypes.add(activity.device_name);
		}
	});
	return Array.from(trainerTypes).sort();
};
