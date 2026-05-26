import { climbRangeForSummit } from "@my-ridings/plan-geometry";
import type { StageScheduleWaypoint } from "../types/stageScheduleWaypoint";
import type { TrackPoint } from "../components/ElevationProfile";

export type ClimbGradientRange = {
	startDistanceKm: number;
	endDistanceKm: number;
	title: string;
	subtitle: string | null;
	endMarkerDistanceKm: number;
};

/** 정상 waypoint에 대한 Wahoo 스타일 경사 프로필 구간 */
export function climbGradientRangeForSummitWaypoint(
	trackPoints: TrackPoint[],
	waypoint: StageScheduleWaypoint,
): ClimbGradientRange {
	const summitKm = waypoint.distanceAlongRouteKm;
	const { startDistanceKm, endDistanceKm } = climbRangeForSummit(trackPoints, summitKm);

	return {
		startDistanceKm,
		endDistanceKm,
		title: waypoint.name,
		subtitle: "정상 · Wahoo Summit 기준 자동 구간",
		endMarkerDistanceKm: summitKm,
	};
}
