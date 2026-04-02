// ── Stage 색상 (2색 순환, emerald 제거 — 지형 green과 구분) ─────────
export interface StageColor {
	stroke: string;
	fill: string;
}

export const STAGE_COLORS: readonly StageColor[] = [
	{ stroke: "#3B82F6", fill: "#93C5FD" }, // Blue
	{ stroke: "#8B5CF6", fill: "#C4B5FD" }, // Violet
] as const;

export const UNPLANNED_COLOR: StageColor = {
	stroke: "#9CA3AF",
	fill: "#D1D5DB",
};

export function getStageColor(dayNumber: number): StageColor {
	return STAGE_COLORS[(dayNumber - 1) % STAGE_COLORS.length];
}

// ── Stage 타입 ─────────────────────────────────────────────────────
export interface Stage {
	id: string;
	dayNumber: number; // 1-based
	distanceKm: number; // 이 Stage의 거리(km)
	startDistanceKm: number; // 전체 경로 기준 시작 거리(km)
	endDistanceKm: number; // 전체 경로 기준 종료 거리(km)
	elevationGain: number; // 획득고도(m) — 자동 계산
	elevationLoss: number; // 하강고도(m) — 자동 계산
	isLastStage: boolean; // "목적지까지"로 생성된 Stage
	memo?: string;
}

// ── Plan 타입 ──────────────────────────────────────────────────────
export interface Plan {
	id: string;
	routeId: string;
	stages: Stage[];
}
