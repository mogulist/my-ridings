// ── 정규화된 데이터 모델 ────────────────────────────────────────────

/**
 * 고도 프로필 차트의 개별 데이터 포인트.
 * 모든 소스(Strava streams, GPX, TrackPoint)에서 이 형식으로 정규화된다.
 */
export type ProfilePoint = {
	/** 경로 시작점으로부터의 누적 거리 (km) */
	distanceKm: number;
	/** 고도 (m) */
	elevationM: number;
	/** 경로 시작으로부터의 경과 시간 (초). 시간 정보 없을 때 undefined */
	elapsedSeconds?: number;
	/** 절대 시각 (Unix ms). 시간 정보 없을 때 undefined */
	absoluteMs?: number;
	/** WGS84 위도. 위치 정보 없을 때 undefined */
	lat?: number;
	/** WGS84 경도. 위치 정보 없을 때 undefined */
	lng?: number;
	/** 원본 배열에서의 인덱스 (hover 연동 등에 사용) */
	sourceIndex: number;
};

/**
 * 일시 정지 구간 (Strava 라이딩에서 멈춘 구간 등).
 * 차트에 음영으로 표시한다.
 */
export type PauseSegment = {
	distanceKmStart: number;
	distanceKmEnd: number;
	elapsedSecondsStart?: number;
	elapsedSecondsEnd?: number;
	absoluteMsStart?: number;
	absoluteMsEnd?: number;
};

// ── 마커 타입 ────────────────────────────────────────────────────────

/** 고도 차트 위에 표시하는 POI 마커의 타입 */
export type MarkerType =
	| "summit"
	| "supply"
	| "water"
	| "cutoff"
	| "checkpoint"
	| "start"
	| "finish"
	| "rest"
	| "custom";

/**
 * 고도 프로필 위에 표시하는 통합 마커.
 * summit, 보급소, 컷오프 등 모든 POI를 이 형식으로 정규화한다.
 */
export type ProfileMarker = {
	id: string;
	type: MarkerType;
	/** 차트에 표시할 레이블 (이름 + 컷오프 시각 등) */
	label: string;
	/** 경로 시작점으로부터의 누적 거리 (km) */
	distanceKm: number;
	/** 마커 색상. 미지정 시 type별 기본 색상 사용 */
	color?: string;
	/** 앱별 추가 메타 (컷오프 시각, 보급 품목 등) */
	meta?: Record<string, unknown>;
};

// ── X축 모드 ─────────────────────────────────────────────────────────

export type XAxisMode = "distance" | "relative-time" | "absolute-time";
