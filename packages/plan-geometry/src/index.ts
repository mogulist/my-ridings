/**
 * @my-ridings/plan-geometry — shared pure functions for route/plan calculations.
 */
export const PLAN_GEOMETRY_PACKAGE_VERSION = 2;

export {
  calibrateThreshold,
  computeElevationGainCurve,
  computeTrackElevationGainLoss,
} from "./elevation-gain";
export type { ClimbProfile, ClimbStartMode, GradientSegment } from "./gradient";
export {
  computeGradientSegments,
  DOWNHILL_COLOR,
  detectClimb,
  getGradientColor,
  lookupGradientAtKm,
} from "./gradient";
export type { RouteDetour } from "./route-detour";
export { computeRouteDetour } from "./route-detour";
export type { SnapLatLngToTrackResult } from "./snap-lat-lng-to-track";
export { snapLatLngToTrack } from "./snap-lat-lng-to-track";
export type { PlanPoiSnapInput, SnappedPlanPoi, StageDistanceRange } from "./snap-plan-pois";
export { planPoiBelongsToStage, snapPlanPoisToTrack } from "./snap-plan-pois";
export { stageDayLabel } from "./stage-day-label";
export type { TrackPoint } from "./track-point";
