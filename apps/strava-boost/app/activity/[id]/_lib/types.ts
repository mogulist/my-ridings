
export type XAxisMode = "distance" | "relative-time" | "absolute-time";

export type ChartPoint = {
	distanceKm: number;
	elapsedSeconds: number;
	absoluteMs: number;
	altitude: number;
	streamIndex: number;
};

export type PauseSegment = {
	distanceKmStart: number;
	distanceKmEnd: number;
	elapsedSecondsStart: number;
	elapsedSecondsEnd: number;
	absoluteMsStart: number;
	absoluteMsEnd: number;
};

export type SummitPoi = {
	id: string;
	name: string;
	lat: number;
	lng: number;
	elevation_m: number | null;
	distanceKm: number;
};

export type EventWaypointPoi = {
	id: string;
	name: string;
	waypoint_type: "start" | "finish" | "checkpoint" | "supply" | "water" | "cutoff" | "summit" | "rest";
	lat: number | null;
	lng: number | null;
	distanceKm: number;
	cutoff_seconds_from_start: number | null;
	supplies_available: string | null;
	memo: string | null;
};

export type EventInfo = {
	id: string;
	name: string;
	event_type: string;
	event_date: string;
	waypoints: EventWaypointPoi[];
};
