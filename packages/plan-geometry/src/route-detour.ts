import type { TrackPoint } from "./track-point";

export type RouteDetour = {
	/** 트랙 배열에서 최근접 인덱스 */
	index: number;
	/** 경로 시작점 기준 누적 거리(m). 최근접 포인트에 d가 없으면 null */
	routeDistanceM: number | null;
	/** 경로에서 벗어난 최단 거리(m) */
	detourM: number;
};

const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111320;

/**
 * 장소가 경로에서 얼마나 벗어나 있고 경로상 어디쯤인지 구한다.
 *
 * snapLatLngToTrack과 달리 위경도를 미터로 환산(정거원통도법 근사)해 비교하므로
 * 한국 위도에서 경도 1도가 위도 1도보다 짧다는 점이 반영된다. 도(degree) 공간에서
 * 그냥 비교하면 동서 방향 거리가 20% 남짓 과대평가된다.
 */
export function computeRouteDetour(
	trackPoints: TrackPoint[],
	lat: number,
	lng: number,
): RouteDetour | null {
	if (trackPoints.length === 0) return null;

	const metersPerDegreeLng =
		METERS_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((lat * Math.PI) / 180);

	let bestIndex = 0;
	let bestSquaredM = Number.POSITIVE_INFINITY;
	for (let i = 0; i < trackPoints.length; i++) {
		const point = trackPoints[i];
		const dx = (point.x - lng) * metersPerDegreeLng;
		const dy = (point.y - lat) * METERS_PER_DEGREE_LAT;
		const squaredM = dx * dx + dy * dy;
		if (squaredM < bestSquaredM) {
			bestSquaredM = squaredM;
			bestIndex = i;
		}
	}

	const nearest = trackPoints[bestIndex];
	return {
		index: bestIndex,
		routeDistanceM: nearest.d ?? null,
		detourM: Math.sqrt(bestSquaredM),
	};
}
