import type { TrackPoint } from "./track-point";

export type SnapLatLngToTrackResult = {
	/** 트랙 배열에서 최근접 인덱스 */
	index: number;
	/** 경로 누적 거리 기준 km (트랙 포인트의 d/1000) */
	distanceKm: number;
};

/**
 * 위경도를 트랙에 최근접 스냅한다 (POI 스냅과 동일한 유클리드 근사).
 * 해당 포인트에 `d`가 없으면 null.
 */
export function snapLatLngToTrack(
	trackPoints: TrackPoint[],
	lat: number,
	lng: number,
): SnapLatLngToTrackResult | null {
	if (trackPoints.length === 0) return null;
	let bestIdx = 0;
	let bestD2 = Infinity;
	for (let i = 0; i < trackPoints.length; i++) {
		const tp = trackPoints[i];
		const d2 = (tp.y - lat) ** 2 + (tp.x - lng) ** 2;
		if (d2 < bestD2) {
			bestD2 = d2;
			bestIdx = i;
		}
	}
	const tp = trackPoints[bestIdx];
	if (tp.d == null) return null;
	return { index: bestIdx, distanceKm: tp.d / 1000 };
}
