import type { SummitCatalogRow } from "@/app/types/summitCatalog";

/** RWGPS 경로 트랙 포인트 (ElevationProfile·KakaoMap과 동일 스키마) */
export type RwgpsTrackPoint = {
	x: number;
	y: number;
	e?: number;
	d?: number;
};

export type RwgpsPointOfInterest = {
	id: number;
	name: string;
	lat: number;
	lng: number;
	poi_type_name: string;
};

export type CPOnRoute = {
	id: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type SummitOnRoute = {
	id: string;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export function computeCPsOnRoute(
	pois: RwgpsPointOfInterest[],
	trackPoints: RwgpsTrackPoint[],
): CPOnRoute[] {
	const controls = pois.filter((p) => p.poi_type_name?.toLowerCase() === "control");
	if (controls.length === 0 || trackPoints.length === 0) return [];

	return controls
		.map((poi) => {
			let bestIdx = 0;
			let bestDist = Infinity;
			for (let i = 0; i < trackPoints.length; i++) {
				const tp = trackPoints[i]!;
				const d2 = (tp.y - poi.lat) ** 2 + (tp.x - poi.lng) ** 2;
				if (d2 < bestDist) {
					bestDist = d2;
					bestIdx = i;
				}
			}
			const tp = trackPoints[bestIdx]!;
			return {
				id: poi.id,
				name: poi.name,
				distanceKm: (tp.d ?? 0) / 1000,
				elevation: tp.e ?? 0,
				trackPointIndex: bestIdx,
			};
		})
		.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function computeSummitsOnRoute(
	summits: SummitCatalogRow[],
	trackPoints: RwgpsTrackPoint[],
): SummitOnRoute[] {
	if (summits.length === 0 || trackPoints.length === 0) return [];
	return summits
		.map((summit) => {
			let bestIdx = 0;
			let bestDist = Infinity;
			for (let i = 0; i < trackPoints.length; i++) {
				const tp = trackPoints[i]!;
				const d2 = (tp.y - summit.lat) ** 2 + (tp.x - summit.lng) ** 2;
				if (d2 < bestDist) {
					bestDist = d2;
					bestIdx = i;
				}
			}
			const tp = trackPoints[bestIdx]!;
			return {
				id: summit.id,
				name: summit.name,
				distanceKm: (tp.d ?? 0) / 1000,
				elevation: summit.elevation_m ?? tp.e ?? 0,
				trackPointIndex: bestIdx,
			};
		})
		.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function summitQueryStringForTrackPoints(trackPoints: RwgpsTrackPoint[]): string | null {
	if (trackPoints.length === 0) return null;
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const point of trackPoints) {
		if (point.y < minLat) minLat = point.y;
		if (point.y > maxLat) maxLat = point.y;
		if (point.x < minLng) minLng = point.x;
		if (point.x > maxLng) maxLng = point.x;
	}
	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}
	const buffer = 0.01;
	const search = new URLSearchParams({
		minLat: String(minLat - buffer),
		maxLat: String(maxLat + buffer),
		minLng: String(minLng - buffer),
		maxLng: String(maxLng + buffer),
		limit: "1200",
	});
	return search.toString();
}
