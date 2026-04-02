/**
 * 지도 검색 마커·POI·고도 CP 색상 (Slate 톤 검색 + Emerald POI).
 */
export type MapVisualPalette = {
	reviewInterested: string;
	reviewNeutral: string;
	reviewDismissed: string;
	poiMarkerFill: string;
	elevationCpStroke: string;
};

export const MAP_VISUAL_PALETTE: MapVisualPalette = {
	reviewInterested: "#475569",
	reviewNeutral: "#94A3B8",
	reviewDismissed: "#CBD5E1",
	poiMarkerFill: "#059669",
	elevationCpStroke: "#059669",
};
