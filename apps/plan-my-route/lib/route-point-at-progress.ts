import type { TrackPoint } from "@my-ridings/plan-geometry";

export type RouteProgressPoint = {
	lat: number;
	lng: number;
	elevation: number | undefined;
	distanceM: number;
};

function interpolateAtDistanceM(
	points: (TrackPoint & { d: number })[],
	targetDistanceM: number,
): (TrackPoint & { d: number }) | null {
	if (points.length === 0) return null;

	const firstPoint = points[0];
	const lastPoint = points[points.length - 1];
	if (targetDistanceM <= firstPoint.d) return firstPoint;
	if (targetDistanceM >= lastPoint.d) return lastPoint;

	for (let index = 0; index < points.length - 1; index++) {
		const currentPoint = points[index];
		const nextPoint = points[index + 1];
		if (currentPoint.d === targetDistanceM) return currentPoint;
		if (nextPoint.d === targetDistanceM) return nextPoint;
		if (currentPoint.d > targetDistanceM || nextPoint.d < targetDistanceM) continue;

		const segmentDistance = nextPoint.d - currentPoint.d;
		if (segmentDistance <= 0) return currentPoint;

		const ratio = (targetDistanceM - currentPoint.d) / segmentDistance;
		return {
			x: currentPoint.x + (nextPoint.x - currentPoint.x) * ratio,
			y: currentPoint.y + (nextPoint.y - currentPoint.y) * ratio,
			e:
				currentPoint.e != null && nextPoint.e != null
					? currentPoint.e + (nextPoint.e - currentPoint.e) * ratio
					: undefined,
			d: targetDistanceM,
		};
	}

	return null;
}

/**
 * 코스 브리핑 progress(0~1)에 해당하는 경로 좌표를 반환한다.
 * 줌/카메라와 무관한 순수 거리 보간.
 */
export function pointAtRouteProgress(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
	progress: number,
): RouteProgressPoint | null {
	if (endKm <= startKm) return null;

	const points = trackPoints.filter((p): p is TrackPoint & { d: number } => p.d != null);
	if (points.length === 0) return null;

	const clamped = Math.min(1, Math.max(0, progress));
	const targetDistanceM = (startKm + clamped * (endKm - startKm)) * 1000;
	const point = interpolateAtDistanceM(points, targetDistanceM);
	if (!point) return null;

	return {
		lat: point.y,
		lng: point.x,
		elevation: point.e,
		distanceM: point.d,
	};
}
