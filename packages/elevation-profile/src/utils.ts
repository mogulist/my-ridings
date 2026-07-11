import type { ProfilePoint, XAxisMode } from "./types";

/** 누적 거리(km) 기준 binary search — 가장 가까운 ProfilePoint 반환 */
export function nearestProfilePoint(distKm: number, data: ProfilePoint[]): ProfilePoint | null {
	if (data.length === 0) return null;
	let lo = 0;
	let hi = data.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (data[mid].distanceKm < distKm) lo = mid + 1;
		else hi = mid;
	}
	if (
		lo > 0 &&
		Math.abs(data[lo - 1].distanceKm - distKm) < Math.abs(data[lo].distanceKm - distKm)
	) {
		return data[lo - 1];
	}
	return data[lo];
}

/** ProfilePoint → XAxisMode에 따른 x축 값 반환 */
export function profilePointToXValue(point: ProfilePoint, mode: XAxisMode): number {
	if (mode === "distance") return point.distanceKm;
	if (mode === "relative-time") return point.elapsedSeconds ?? 0;
	return point.absoluteMs ?? 0;
}

export function formatDistanceAxis(km: number): string {
	return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
}

export function formatRelativeTimeAxis(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h === 0) return `${m}분`;
	return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatAbsoluteTimeAxis(ms: number): string {
	const d = new Date(ms);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatAbsoluteTimeTooltip(ms: number): string {
	const d = new Date(ms);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const ELEVATION_Y_STEP_M = 50;

/** 고도 프로필 Y축 도메인 — 50m 단위 정수로 맞춰 좁은 축에서 소수 라벨이 잘리지 않게 함 */
export function computeElevationYDomain(elevationsM: number[]): { minAlt: number; maxAlt: number } {
	if (elevationsM.length === 0) return { minAlt: 0, maxAlt: 100 };

	const rawMin = Math.max(0, Math.min(...elevationsM) - 20);
	const peakAlt = Math.max(...elevationsM);
	const rawMax = peakAlt + Math.max((peakAlt - rawMin) * 0.08, 10);

	return {
		minAlt: Math.floor(rawMin / ELEVATION_Y_STEP_M) * ELEVATION_Y_STEP_M,
		maxAlt: Math.ceil(rawMax / ELEVATION_Y_STEP_M) * ELEVATION_Y_STEP_M,
	};
}

export function formatElevationAxisTick(meters: number): string {
	return `${Math.round(meters)}m`;
}
