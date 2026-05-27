import type { TrackPoint } from "./track-point";

// ── 타입 ─────────────────────────────────────────────────────────

export type GradientSegment = {
	startKm: number;
	endKm: number;
	gradientPct: number;
	color: string;
};

export type ClimbProfile = {
	startDistanceKm: number;
	summitDistanceKm: number;
	gainM: number;
	lengthKm: number;
	avgGradientPct: number;
	maxGradientPct: number;
	category: "HC" | "1" | "2" | "3" | "4" | null;
};

/** 클라임 시작점 감지 방식 */
export type ClimbStartMode = "full" | "sustained" | "steep";

// ── Wahoo Summit 색상 기준 ───────────────────────────────────────

const GRADIENT_ZONES: { max: number; color: string }[] = [
	{ max: 3, color: "#9CA3AF" }, // gray  — 0–3%
	{ max: 5, color: "#EAB308" }, // yellow — 3–5%
	{ max: 8, color: "#F97316" }, // orange — 5–8%
	{ max: 10, color: "#EA580C" }, // dark-orange — 8–10%
	{ max: 15, color: "#EF4444" }, // red — 10–15%
	{ max: Infinity, color: "#A855F7" }, // purple — 15%+
];

export function getGradientColor(pct: number): string {
	if (pct < 0) return "#9CA3AF"; // 내리막 → 회색
	for (const zone of GRADIENT_ZONES) {
		if (pct < zone.max) return zone.color;
	}
	return "#A855F7";
}

// ── 내부 헬퍼 ─────────────────────────────────────────────────────

const SMOOTH_WINDOW = 9;

function smoothArr(arr: number[]): number[] {
	const half = Math.floor(SMOOTH_WINDOW / 2);
	return arr.map((_, i) => {
		const s = Math.max(0, i - half);
		const e = Math.min(arr.length, i + half + 1);
		let sum = 0;
		for (let j = s; j < e; j++) sum += arr[j];
		return sum / (e - s);
	});
}

type ValidPt = TrackPoint & { d: number; e: number };

function filterValidPts(
	trackPoints: TrackPoint[],
	startM = -Infinity,
	endM = Infinity,
): ValidPt[] {
	return trackPoints.filter(
		(p): p is ValidPt => p.e != null && p.d != null && p.d >= startM && p.d <= endM,
	);
}

// ── 경사도 세그먼트 계산 ──────────────────────────────────────────

/**
 * trackPoints 배열로부터 각 구간의 경사도 색상 세그먼트를 반환.
 * windowM: 기울기 계산에 사용할 앞방향 거리(m). 기본 100m.
 */
export function computeGradientSegments(
	trackPoints: TrackPoint[],
	windowM = 100,
	startKm?: number,
	endKm?: number,
): GradientSegment[] {
	const pts = filterValidPts(
		trackPoints,
		startKm != null ? startKm * 1000 : -Infinity,
		endKm != null ? endKm * 1000 : Infinity,
	);
	if (pts.length < 2) return [];

	const smoothedEle = smoothArr(pts.map((p) => p.e));

	// 각 포인트에서 windowM 앞의 포인트까지 기울기 계산
	const gradients = pts.map((pt, i) => {
		if (i >= pts.length - 1) return 0;
		const targetD = pt.d + windowM;
		// targetD 이전의 마지막 포인트 탐색
		let j = i + 1;
		while (j + 1 < pts.length && pts[j + 1].d <= targetD) j++;
		const dDiff = pts[j].d - pt.d;
		if (dDiff < 5) return 0;
		return ((smoothedEle[j] - smoothedEle[i]) / dDiff) * 100;
	});

	// 같은 색상의 연속 포인트를 하나의 세그먼트로 병합
	const segments: GradientSegment[] = [];
	let currentColor = getGradientColor(gradients[0]);
	let segStartKm = pts[0].d / 1000;
	let segGrad = gradients[0];

	for (let i = 1; i < pts.length; i++) {
		const color = getGradientColor(gradients[i]);
		if (color !== currentColor) {
			segments.push({
				startKm: segStartKm,
				endKm: pts[i].d / 1000,
				gradientPct: Math.round(segGrad * 10) / 10,
				color: currentColor,
			});
			segStartKm = pts[i].d / 1000;
			currentColor = color;
			segGrad = gradients[i];
		}
	}
	segments.push({
		startKm: segStartKm,
		endKm: pts[pts.length - 1].d / 1000,
		gradientPct: Math.round(segGrad * 10) / 10,
		color: currentColor,
	});

	return segments;
}

/**
 * 세그먼트 목록에서 특정 km 위치의 경사도(%)를 반환.
 */
export function lookupGradientAtKm(segments: GradientSegment[], km: number): number | null {
	for (const seg of segments) {
		if (km >= seg.startKm && km <= seg.endKm) return seg.gradientPct;
	}
	return null;
}

// ── 클라임 카테고리 ────────────────────────────────────────────────

function classifyClimb(gainM: number, lengthKm: number): ClimbProfile["category"] {
	if (gainM < 40 || lengthKm <= 0) return null;
	// Fiets 근사 공식: score = gainM² / (lengthKm * 10)
	const score = (gainM * gainM) / (lengthKm * 10);
	if (score >= 8000) return "HC";
	if (score >= 3200) return "1";
	if (score >= 800) return "2";
	if (score >= 200) return "3";
	if (score >= 40) return "4";
	return null;
}

// ── 클라임 감지 ───────────────────────────────────────────────────

/**
 * Wahoo Summit 기준에 준하는 클라임을 서밋 위치 기준으로 역탐색.
 * - startMode:
 *   "full"      — valley-break 내 최저점 (현재 기본, 접근 구간 포함)
 *   "sustained" — 서밋까지 평균경사 ≥ 5% 인 가장 먼 시작점
 *   "steep"     — 서밋까지 평균경사 ≥ 7% 인 가장 먼 시작점 (Wahoo 유사)
 */
export function detectClimb(
	summitDistanceKm: number,
	trackPoints: TrackPoint[],
	startMode: ClimbStartMode = "full",
): ClimbProfile | null {
	const MIN_GAIN_M = 50;
	const MIN_LENGTH_M = 500;
	const MIN_AVG_GRADIENT_PCT = 2.0;
	const MAX_LOOKBACK_M = 30000;
	const MAX_GRADIENT_WINDOW_M = 500;
	const VALLEY_BREAK_M = 50;

	const validPts = filterValidPts(trackPoints);
	if (validPts.length < 2) return null;

	const summitDm = summitDistanceKm * 1000;

	// 서밋과 가장 가까운 유효 포인트 찾기
	let summitIdx = 0;
	let minDistToSummit = Infinity;
	for (let i = 0; i < validPts.length; i++) {
		const d = Math.abs(validPts[i].d - summitDm);
		if (d < minDistToSummit) {
			minDistToSummit = d;
			summitIdx = i;
		}
	}
	const summitPt = validPts[summitIdx];

	// 역방향 탐색: valley-break 공통 적용
	let searchMinEle = summitPt.e;
	let minIdx = summitIdx; // "full" 모드의 최저점 인덱스

	if (startMode === "full") {
		for (let i = summitIdx - 1; i >= 0; i--) {
			const pt = validPts[i];
			if (summitPt.d - pt.d > MAX_LOOKBACK_M) break;
			if (pt.e < searchMinEle) {
				searchMinEle = pt.e;
				minIdx = i;
			} else if (pt.e > searchMinEle + VALLEY_BREAK_M) {
				break;
			}
		}
	} else {
		// "sustained" | "steep": 서밋까지 평균경사 threshold 기반
		const avgGradThreshold = startMode === "steep" ? 7.0 : 5.0;
		for (let i = summitIdx - 1; i >= 0; i--) {
			const pt = validPts[i];
			if (summitPt.d - pt.d > MAX_LOOKBACK_M) break;
			if (pt.e < searchMinEle) {
				searchMinEle = pt.e;
			} else if (pt.e > searchMinEle + VALLEY_BREAK_M) {
				break;
			}
			const dist = summitPt.d - pt.d;
			const gain = summitPt.e - pt.e;
			if (dist > 0 && gain > 0 && (gain / dist) * 100 >= avgGradThreshold) {
				minIdx = i;
			}
		}
	}

	const startPt = validPts[minIdx];
	const gainM = summitPt.e - startPt.e;
	const lengthM = summitPt.d - startPt.d;

	if (gainM < MIN_GAIN_M) return null;
	if (lengthM < MIN_LENGTH_M) return null;

	const avgGradientPct = (gainM / lengthM) * 100;
	if (avgGradientPct < MIN_AVG_GRADIENT_PCT) return null;

	// 500m 윈도우 최대 경사도 계산
	let maxGradientPct = avgGradientPct;
	for (let i = minIdx; i < summitIdx; i++) {
		const ptA = validPts[i];
		let j = i;
		for (let k = i + 1; k <= summitIdx; k++) {
			if (validPts[k].d - ptA.d >= MAX_GRADIENT_WINDOW_M) {
				j = k;
				break;
			}
			j = k;
		}
		if (j === i) continue;
		const ptB = validPts[j];
		const dDiff = ptB.d - ptA.d;
		const eDiff = ptB.e - ptA.e;
		if (dDiff > 0 && eDiff > 0) {
			const grad = (eDiff / dDiff) * 100;
			if (grad > maxGradientPct) maxGradientPct = grad;
		}
	}

	return {
		startDistanceKm: startPt.d / 1000,
		summitDistanceKm: summitPt.d / 1000,
		gainM: Math.round(gainM),
		lengthKm: Math.round(lengthM / 10) / 100,
		avgGradientPct: Math.round(avgGradientPct * 10) / 10,
		maxGradientPct: Math.round(maxGradientPct * 10) / 10,
		category: classifyClimb(gainM, lengthM / 1000),
	};
}
