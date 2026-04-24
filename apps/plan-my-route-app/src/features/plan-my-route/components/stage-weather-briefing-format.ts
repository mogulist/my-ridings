import type { StagePointPosition } from "@my-ridings/weather-types";

export const formatStageKmRange = (kmFrom: number, kmTo: number): string => {
	if (Math.abs(kmTo - kmFrom) < 0.05) return `${kmFrom.toFixed(1)} km`;
	return `${kmFrom.toFixed(1)}–${kmTo.toFixed(1)} km`;
};

export const positionEndBadge = (position: StagePointPosition): string | null => {
	if (position === "departure") return "출발";
	if (position === "arrival") return "도착";
	return null;
};

export const formatLatLng = (lat: number, lng: number): string =>
	`${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;

export const formatGridMetaLine = (nx: number, ny: number, lat: number, lng: number): string =>
	`(${nx}, ${ny}) · ${formatLatLng(lat, lng)}`;

export const formatRegionTitle = (names: string[]): string => {
	if (names.length === 0) return "지역명 없음";
	if (names.length === 1) return names[0]!;
	if (names.length === 2) return `${names[0]} · ${names[1]}`;
	return `${names[0]} · ${names[1]} 외 ${names.length - 2}`;
};
