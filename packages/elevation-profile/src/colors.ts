import type { MarkerType } from "./types";

/**
 * 마커 타입별 기본 색상 (통합 색상맵).
 * 기존 strava-boost의 WAYPOINT_COLORS와 plan-my-route의 CP_COLOR를 단일 소스로 통합.
 */
export const MARKER_COLORS: Record<MarkerType, string> = {
	summit: "#7c3aed", // violet-700
	supply: "#2563eb", // blue-600
	water: "#0891b2", // cyan-600
	cutoff: "#dc2626", // red-600
	checkpoint: "#16a34a", // green-600
	start: "#16a34a", // green-600
	finish: "#1d4ed8", // blue-700
	rest: "#6b7280", // gray-500
	custom: "#374151", // gray-700
};

export function markerColor(type: MarkerType, override?: string): string {
	return override ?? MARKER_COLORS[type];
}

// 경사도 색상은 plan-geometry의 getGradientColor를 그대로 re-export
export { DOWNHILL_COLOR, getGradientColor } from "@my-ridings/plan-geometry";
