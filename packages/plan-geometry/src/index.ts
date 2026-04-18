/**
 * @my-ridings/plan-geometry — shared pure functions for route/plan calculations.
 */
export const PLAN_GEOMETRY_PACKAGE_VERSION = 1;

export type { TrackPoint } from "./track-point";
export type { PlanPoiSnapInput, SnappedPlanPoi } from "./snap-plan-pois";
export { snapPlanPoisToTrack } from "./snap-plan-pois";
