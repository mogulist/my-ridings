import {
	analyzeTerrain,
	calibrateThreshold,
	snapPlanPoisToTrack,
	type TerrainAnalysis,
	type SnappedPlanPoi,
} from "@my-ridings/plan-geometry";
import type { PlanDetail, TrackPoint, SummitMarkerOnRoute } from "@/features/api/plan-my-route";
export type RideSupplyPlan = {
	track: TrackPoint[];
	threshold: number;
	stages: { id: string; startDistanceKm: number; endDistanceKm: number }[];
	stops: SnappedPlanPoi[];
	terrain?: TerrainAnalysis;
	summitMarkers?: SummitMarkerOnRoute[];
};

export function prepareRideSupplyPlan(detail: PlanDetail): RideSupplyPlan {
	const track = detail.trackPoints.filter(
		(point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.d),
	);
	const supplies = detail.planPois.filter(
		(poi) =>
			(poi.poi_type === "convenience" || poi.poi_type === "mart") &&
			poi.intent !== "confirmed" &&
			!poi.is_candidate_excluded,
	);
	return {
		track,
		terrain: analyzeTerrain(detail.trackPoints),
		summitMarkers: detail.summitMarkers ?? [],
		threshold: calibrateThreshold(track, detail.knownRouteElevationGainM),
		stages: detail.stages.map((stage) => ({
			id: stage.id,
			startDistanceKm: (stage.start_distance ?? 0) / 1000,
			endDistanceKm: (stage.end_distance ?? stage.start_distance ?? 0) / 1000,
		})),
		// A missing altitude must not hide a supply stop. The original track remains unchanged.
		stops: snapPlanPoisToTrack(
			supplies,
			track.map((point) => ({ ...point, e: point.e ?? 0 })),
		),
	};
}
