export type StravaActivity = {
	id: number;
	name: string;
	distance: number; // meters
	moving_time: number; // seconds
	elapsed_time: number; // seconds
	type: string;
	start_date: string;
	start_date_local: string;
	gear_id: string | null;
	average_speed: number; // meters per second
	max_speed: number; // meters per second
	total_elevation_gain?: number; // meters
	trainer?: boolean; // 실내 트레이너 사용 여부
	device_name?: string; // 활동 기록에 사용된 디바이스 이름
	workout_type?: number; // 워크아웃 타입
};

export type StravaTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	expires_in: number;
	athlete: {
		id: number;
		username: string;
		firstname: string;
		lastname: string;
	};
};

export type EBikeStats = {
	totalDistance: number; // kilometers
	totalCount: number;
	byYear: {
		[year: string]: {
			distance: number; // kilometers
			count: number;
		};
	};
};

export type ActivityStreams = {
	activityId: number;
	altitude: number[]; // 고도 (m)
	distance: number[]; // 누적 거리 (m)
	time: number[];     // 경과 시간 (초, 출발 기준 0)
	latlng?: [number, number][]; // [lat, lng]
};

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
