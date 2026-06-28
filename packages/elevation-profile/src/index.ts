export {
	detectPausesFromStreams,
	downsample,
	fromGpxPoints,
	fromStravaStreams,
	fromTrackPoints,
	summitsToMarkers,
	waypointsToMarkers,
} from "./adapters";
export { DOWNHILL_COLOR, getGradientColor, MARKER_COLORS, markerColor } from "./colors";
export type { MarkerType, PauseSegment, ProfileMarker, ProfilePoint, XAxisMode } from "./types";
