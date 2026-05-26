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
export type {
	ClimbDetectionOptions,
	DetectedClimb,
	GradeBand,
	GradeSegment,
} from "./grade-profile";
export {
	climbRangeForSummit,
	computeGradeSegments,
	detectClimbs,
	gradeBandForPercent,
	isWahooClimb,
	summarizeClimbRange,
	WAHOO_GRADE_COLORS,
	WAHOO_GRADE_LABELS_KO,
	WAHOO_GRADE_SEGMENT_LENGTH_M,
	wahooMinAvgGradeForLength,
} from "./grade-profile";
export type { SnapLatLngToTrackResult } from "./snap-lat-lng-to-track";
export { snapLatLngToTrack } from "./snap-lat-lng-to-track";
