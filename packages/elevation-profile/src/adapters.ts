import { MARKER_COLORS } from "./colors";
import type { PauseSegment, ProfileMarker, ProfilePoint } from "./types";

// ── 다운샘플링 헬퍼 ──────────────────────────────────────────────────

/**
 * 배열을 최대 maxPoints 개수로 균등 샘플링.
 * 첫 점과 끝 점은 항상 포함한다.
 */
export function downsample<T>(arr: T[], maxPoints: number): T[] {
	if (arr.length <= maxPoints) return arr;
	const result: T[] = [];
	const step = (arr.length - 1) / (maxPoints - 1);
	for (let i = 0; i < maxPoints; i++) {
		result.push(arr[Math.round(i * step)]);
	}
	return result;
}

// ── Strava streams 어댑터 ────────────────────────────────────────────

type StravaStreams = {
	altitude: number[];
	distance: number[];
	time?: number[];
	latlng?: [number, number][];
};

/**
 * Strava ActivityStreams → ProfilePoint[].
 * startMs: 활동 시작 절대 시각 (Unix ms). 시간 축 렌더에 사용.
 */
export function fromStravaStreams(
	streams: StravaStreams,
	startMs: number,
	maxPoints = 2000,
): ProfilePoint[] {
	const len = Math.min(streams.altitude.length, streams.distance.length);
	const raw: ProfilePoint[] = [];

	for (let i = 0; i < len; i++) {
		const elapsed = streams.time?.[i];
		const latlng = streams.latlng?.[i];
		raw.push({
			distanceKm: streams.distance[i] / 1000,
			elevationM: streams.altitude[i],
			elapsedSeconds: elapsed,
			absoluteMs: elapsed != null ? startMs + elapsed * 1000 : undefined,
			lat: latlng?.[0],
			lng: latlng?.[1],
			sourceIndex: i,
		});
	}

	return downsample(raw, maxPoints);
}

// ── GPX 포인트 어댑터 ────────────────────────────────────────────────

type GpxPoint = {
	distanceKm: number;
	ele?: number | null;
	lat?: number;
	lng?: number;
};

/**
 * GpxPointWithDistance[] (kfondo 형식) → ProfilePoint[].
 */
export function fromGpxPoints(points: GpxPoint[], maxPoints = 2000): ProfilePoint[] {
	const raw: ProfilePoint[] = points.map((p, i) => ({
		distanceKm: p.distanceKm,
		elevationM: p.ele ?? 0,
		lat: p.lat,
		lng: p.lng,
		sourceIndex: i,
	}));
	return downsample(raw, maxPoints);
}

// ── plan-geometry TrackPoint 어댑터 ─────────────────────────────────

type TrackPoint = {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도 (m)
	d?: number; // 누적 거리 (m)
};

/**
 * plan-geometry TrackPoint[] → ProfilePoint[].
 * plan-my-route의 ElevationProfile에서 사용하는 형식.
 */
export function fromTrackPoints(points: TrackPoint[], maxPoints = 2000): ProfilePoint[] {
	const valid = points.filter(
		(p): p is TrackPoint & { e: number; d: number } => p.e != null && p.d != null,
	);
	const raw: ProfilePoint[] = valid.map((p, i) => ({
		distanceKm: p.d / 1000,
		elevationM: p.e,
		lat: p.y,
		lng: p.x,
		sourceIndex: i,
	}));
	return downsample(raw, maxPoints);
}

// ── 마커 어댑터 ─────────────────────────────────────────────────────

type SummitPoi = {
	id: string;
	name: string;
	distanceKm: number;
};

/** strava-boost SummitPoi[] → ProfileMarker[] */
export function summitsToMarkers(summits: SummitPoi[]): ProfileMarker[] {
	return summits.map((s) => ({
		id: `summit-${s.id}`,
		type: "summit" as const,
		label: s.name,
		distanceKm: s.distanceKm,
		color: MARKER_COLORS.summit,
	}));
}

type EventWaypointPoi = {
	id: string;
	name: string;
	waypoint_type:
		| "start"
		| "finish"
		| "checkpoint"
		| "supply"
		| "water"
		| "cutoff"
		| "summit"
		| "rest";
	distanceKm: number;
	cutoff_seconds_from_start?: number | null;
};

/**
 * strava-boost EventWaypointPoi[] → ProfileMarker[].
 * cutoff 마커에는 시각 문자열을 label에 포함한다.
 */
export function waypointsToMarkers(
	waypoints: EventWaypointPoi[],
	eventStartMs?: number,
): ProfileMarker[] {
	return waypoints.map((wp) => {
		let label = wp.name;
		if (
			wp.waypoint_type === "cutoff" &&
			wp.cutoff_seconds_from_start != null &&
			eventStartMs != null
		) {
			const cutoffMs = eventStartMs + wp.cutoff_seconds_from_start * 1000;
			const time = new Date(cutoffMs).toLocaleTimeString("ko-KR", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
			label = `${wp.name} (${time})`;
		}
		return {
			id: `wp-${wp.id}`,
			type: wp.waypoint_type,
			label,
			distanceKm: wp.distanceKm,
			color: MARKER_COLORS[wp.waypoint_type] ?? MARKER_COLORS.checkpoint,
			meta:
				wp.cutoff_seconds_from_start != null
					? { cutoffSeconds: wp.cutoff_seconds_from_start }
					: undefined,
		};
	});
}

// ── Strava 일시정지 감지 ────────────────────────────────────────────

type StreamsForPause = {
	time?: number[];
	distance: number[];
	latlng?: [number, number][];
};

const PAUSE_GAP_SECONDS = 30;
const PAUSE_MIN_DURATION_SECONDS = 10;

/**
 * Strava streams에서 일시 정지 구간을 감지한다.
 * time 스트림이 없으면 빈 배열을 반환한다.
 */
export function detectPausesFromStreams(streams: StreamsForPause, startMs: number): PauseSegment[] {
	if (!streams.time || streams.time.length < 2) return [];
	const pauses: PauseSegment[] = [];
	const { time, distance } = streams;

	for (let i = 1; i < time.length; i++) {
		const gap = time[i] - time[i - 1];
		if (gap >= PAUSE_GAP_SECONDS) {
			const duration = gap - 1;
			if (duration >= PAUSE_MIN_DURATION_SECONDS) {
				pauses.push({
					distanceKmStart: distance[i - 1] / 1000,
					distanceKmEnd: distance[i] / 1000,
					elapsedSecondsStart: time[i - 1],
					elapsedSecondsEnd: time[i],
					absoluteMsStart: startMs + time[i - 1] * 1000,
					absoluteMsEnd: startMs + time[i] * 1000,
				});
			}
		}
	}
	return pauses;
}
