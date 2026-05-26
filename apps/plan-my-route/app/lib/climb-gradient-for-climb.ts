import type { DetectedClimb } from "@my-ridings/plan-geometry";
import type { SummitOnRoute } from "../components/ElevationProfile";
import type { ClimbGradientRange } from "./climb-gradient-for-waypoint";

export type { ClimbGradientRange };

function climbLabel(climb: DetectedClimb, summits: SummitOnRoute[]): string {
	const near = summits.find((s) => Math.abs(s.distanceKm - climb.peakDistanceKm) < 0.25);
	if (near?.name?.trim()) return near.name.trim();
	return `${climb.lengthKm.toFixed(1)} km 오르막`;
}

export function climbGradientRangeForDetectedClimb(
	climb: DetectedClimb,
	summitMarkers: SummitOnRoute[] = [],
): ClimbGradientRange {
	return {
		startDistanceKm: climb.startDistanceKm,
		endDistanceKm: climb.peakDistanceKm,
		title: climbLabel(climb, summitMarkers),
		subtitle: "Wahoo Summit 기준 자동 탐지",
		endMarkerDistanceKm: climb.peakDistanceKm,
	};
}
