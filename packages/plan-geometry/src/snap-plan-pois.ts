import type { TrackPoint } from "./track-point";

/** POI 스냅 입력 — `PlanPoiRow` 등 추가 필드가 있어도 구조적 호환으로 전달 가능 */
export type PlanPoiSnapInput = {
	id: string;
	name: string;
	poi_type: string;
	memo: string | null;
	lat: number;
	lng: number;
};

export type SnappedPlanPoi = {
	id: string;
	name: string;
	poiType: string;
	memo: string | null;
	distanceKm: number;
	elevation: number;
};

export function snapPlanPoisToTrack(
	planPois: PlanPoiSnapInput[],
	trackPoints: TrackPoint[],
): SnappedPlanPoi[] {
	if (trackPoints.length === 0 || planPois.length === 0) return [];
	const out: SnappedPlanPoi[] = [];
	for (const poi of planPois) {
		let bestIdx = 0;
		let bestD2 = Infinity;
		for (let i = 0; i < trackPoints.length; i++) {
			const tp = trackPoints[i];
			const d2 = (tp.y - poi.lat) ** 2 + (tp.x - poi.lng) ** 2;
			if (d2 < bestD2) {
				bestD2 = d2;
				bestIdx = i;
			}
		}
		const tp = trackPoints[bestIdx];
		if (tp?.d == null || tp.e == null) continue;
		out.push({
			id: poi.id,
			name: poi.name,
			poiType: poi.poi_type,
			memo: poi.memo,
			distanceKm: tp.d / 1000,
			elevation: Math.round(tp.e),
		});
	}
	return out.sort((a, b) => a.distanceKm - b.distanceKm);
}
