/**
 * @my-ridings/plan-geometry — shared pure functions for route/plan calculations.
 */
export const PLAN_GEOMETRY_PACKAGE_VERSION = 2;

export type { TrackPoint } from "./track-point";
export type { PlanPoiSnapInput, SnappedPlanPoi } from "./snap-plan-pois";
export { snapPlanPoisToTrack } from "./snap-plan-pois";
export {
	calibrateThreshold,
	computeElevationGainCurve,
	computeTrackElevationGainLoss,
} from "./elevation-gain";
export { stageDayLabel } from "./stage-day-label";
export type { SnapLatLngToTrackResult } from "./snap-lat-lng-to-track";
export { snapLatLngToTrack } from "./snap-lat-lng-to-track";
