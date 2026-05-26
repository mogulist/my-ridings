import type { TrackPoint } from "./track-point";
import {
	gradeBandForPercent,
	isWahooClimb,
	WAHOO_GRADE_SEGMENT_LENGTH_M,
} from "./grade-thresholds";

export type { GradeBand } from "./grade-thresholds";
export {
	gradeBandForPercent,
	isWahooClimb,
	WAHOO_GRADE_COLORS,
	WAHOO_GRADE_LABELS_KO,
	WAHOO_GRADE_SEGMENT_LENGTH_M,
	wahooMinAvgGradeForLength,
} from "./grade-thresholds";

const SMOOTH_WINDOW = 9;

type PreparedPoint = {
	distanceM: number;
	elevation: number;
	trackIndex: number;
};

export type GradeSegment = {
	startDistanceM: number;
	endDistanceM: number;
	gradePercent: number;
	band: ReturnType<typeof gradeBandForPercent>;
};

export type DetectedClimb = {
	id: string;
	startDistanceKm: number;
	endDistanceKm: number;
	lengthKm: number;
	elevationGainM: number;
	avgGradePercent: number;
	maxGradePercent: number;
	/** 구간 내 최고점 거리 (km) */
	peakDistanceKm: number;
};

export type ClimbDetectionOptions = {
	/** 구간 [startKm, endKm] 안에서만 탐지 */
	startKm?: number;
	endKm?: number;
};

function smoothElevations(elevations: number[]): number[] {
	const half = Math.floor(SMOOTH_WINDOW / 2);
	return elevations.map((_, i) => {
		const start = Math.max(0, i - half);
		const end = Math.min(elevations.length, i + half + 1);
		let sum = 0;
		for (let j = start; j < end; j++) sum += elevations[j];
		return sum / (end - start);
	});
}

function prepareTrack(trackPoints: TrackPoint[]): PreparedPoint[] {
	const valid: Array<TrackPoint & { e: number; d: number }> = [];
	for (const p of trackPoints) {
		if (p.e != null && p.d != null) valid.push(p as TrackPoint & { e: number; d: number });
	}
	if (valid.length < 2) return [];

	const smoothed = smoothElevations(valid.map((p) => p.e));
	return valid.map((p, i) => ({
		distanceM: p.d,
		elevation: smoothed[i],
		trackIndex: i,
	}));
}

function elevationAtDistanceM(prepared: PreparedPoint[], distanceM: number): number | null {
	if (prepared.length === 0) return null;
	if (distanceM <= prepared[0].distanceM) return prepared[0].elevation;
	const last = prepared[prepared.length - 1];
	if (distanceM >= last.distanceM) return last.elevation;

	for (let i = 1; i < prepared.length; i++) {
		const a = prepared[i - 1];
		const b = prepared[i];
		if (distanceM >= a.distanceM && distanceM <= b.distanceM) {
			const span = b.distanceM - a.distanceM;
			if (span <= 0) return a.elevation;
			const t = (distanceM - a.distanceM) / span;
			return a.elevation + t * (b.elevation - a.elevation);
		}
	}
	return null;
}

/**
 * Wahoo와 같이 10m 단위로 경사 구간을 계산한다.
 */
export function computeGradeSegments(
	trackPoints: TrackPoint[],
	options?: { startKm?: number; endKm?: number; segmentLengthM?: number },
): GradeSegment[] {
	const prepared = prepareTrack(trackPoints);
	if (prepared.length < 2) return [];

	const startM = (options?.startKm ?? 0) * 1000;
	const endM = (options?.endKm ?? prepared[prepared.length - 1].distanceM / 1000) * 1000;
	const segLen = options?.segmentLengthM ?? WAHOO_GRADE_SEGMENT_LENGTH_M;

	const segments: GradeSegment[] = [];
	let cursor = Math.ceil(startM / segLen) * segLen;
	if (cursor < startM) cursor += segLen;

	while (cursor + segLen <= endM) {
		const eleStart = elevationAtDistanceM(prepared, cursor);
		const eleEnd = elevationAtDistanceM(prepared, cursor + segLen);
		if (eleStart != null && eleEnd != null) {
			const gradePercent = ((eleEnd - eleStart) / segLen) * 100;
			segments.push({
				startDistanceM: cursor,
				endDistanceM: cursor + segLen,
				gradePercent,
				band: gradeBandForPercent(gradePercent),
			});
		}
		cursor += segLen;
	}

	return segments;
}

type UphillRun = {
	startM: number;
	endM: number;
	startEle: number;
	endEle: number;
	peakM: number;
	peakEle: number;
	maxGradePercent: number;
};

function mergeUphillRuns(runs: UphillRun[], gapM: number): UphillRun[] {
	if (runs.length === 0) return [];
	const merged: UphillRun[] = [{ ...runs[0] }];
	for (let i = 1; i < runs.length; i++) {
		const prev = merged[merged.length - 1];
		const cur = runs[i];
		if (cur.startM - prev.endM <= gapM) {
			prev.endM = cur.endM;
			prev.endEle = cur.endEle;
			if (cur.peakEle > prev.peakEle) {
				prev.peakM = cur.peakM;
				prev.peakEle = cur.peakEle;
			}
			prev.maxGradePercent = Math.max(prev.maxGradePercent, cur.maxGradePercent);
		} else {
			merged.push({ ...cur });
		}
	}
	return merged;
}

/**
 * Wahoo Summit 기준으로 경로(또는 구간) 내 클라임을 탐지한다.
 */
export function detectClimbs(
	trackPoints: TrackPoint[],
	options?: ClimbDetectionOptions,
): DetectedClimb[] {
	const prepared = prepareTrack(trackPoints);
	if (prepared.length < 2) return [];

	const totalEndM = prepared[prepared.length - 1].distanceM;
	const rangeStartM = (options?.startKm ?? 0) * 1000;
	const rangeEndM = (options?.endKm ?? totalEndM / 1000) * 1000;

	const segments = computeGradeSegments(trackPoints, {
		startKm: rangeStartM / 1000,
		endKm: rangeEndM / 1000,
	});

	const runs: UphillRun[] = [];
	let current: UphillRun | null = null;
	const FLAT_GRADE_THRESHOLD = 1.5;
	const MERGE_GAP_M = 30;

	for (const seg of segments) {
		const isUphill = seg.gradePercent >= FLAT_GRADE_THRESHOLD;
		if (isUphill) {
			if (!current) {
				current = {
					startM: seg.startDistanceM,
					endM: seg.endDistanceM,
					startEle:
						elevationAtDistanceM(prepared, seg.startDistanceM) ?? 0,
					endEle: elevationAtDistanceM(prepared, seg.endDistanceM) ?? 0,
					peakM: seg.endDistanceM,
					peakEle: elevationAtDistanceM(prepared, seg.endDistanceM) ?? 0,
					maxGradePercent: seg.gradePercent,
				};
			} else {
				current.endM = seg.endDistanceM;
				current.endEle = elevationAtDistanceM(prepared, seg.endDistanceM) ?? current.endEle;
				const midEle = elevationAtDistanceM(prepared, seg.endDistanceM) ?? 0;
				if (midEle >= current.peakEle) {
					current.peakM = seg.endDistanceM;
					current.peakEle = midEle;
				}
				current.maxGradePercent = Math.max(current.maxGradePercent, seg.gradePercent);
			}
		} else if (current) {
			runs.push(current);
			current = null;
		}
	}
	if (current) runs.push(current);

	const merged = mergeUphillRuns(runs, MERGE_GAP_M);
	const climbs: DetectedClimb[] = [];

	for (let i = 0; i < merged.length; i++) {
		const run = merged[i];
		const lengthM = run.endM - run.startM;
		const eleGain = Math.max(0, run.peakEle - run.startEle);
		const avgGrade = lengthM > 0 ? (eleGain / lengthM) * 100 : 0;

		if (!isWahooClimb(lengthM, avgGrade)) continue;

		climbs.push({
			id: `climb-${i}-${Math.round(run.startM)}`,
			startDistanceKm: run.startM / 1000,
			endDistanceKm: run.peakM / 1000,
			lengthKm: Math.round((lengthM / 1000) * 100) / 100,
			elevationGainM: Math.round(eleGain),
			avgGradePercent: Math.round(avgGrade * 10) / 10,
			maxGradePercent: Math.round(run.maxGradePercent * 10) / 10,
			peakDistanceKm: run.peakM / 1000,
		});
	}

	return climbs;
}

export type ClimbForSummitOptions = {
	/** 정상과 클라임 끝 거리 허용 (m) */
	summitToleranceM?: number;
};

/**
 * 정상 지점에 대응하는 Wahoo 클라임 구간을 찾는다.
 * 탐지된 클라임이 없으면 정상에서 역방향 스캔으로 구간을 추정한다.
 */
export function climbRangeForSummit(
	trackPoints: TrackPoint[],
	summitDistanceKm: number,
	options?: ClimbForSummitOptions & ClimbDetectionOptions,
): { startDistanceKm: number; endDistanceKm: number; climb: DetectedClimb | null } {
	const toleranceM = options?.summitToleranceM ?? 200;
	const summitM = summitDistanceKm * 1000;

	const searchStartKm = Math.max(0, summitDistanceKm - 15);
	const climbs = detectClimbs(trackPoints, {
		...options,
		startKm: options?.startKm ?? searchStartKm,
		endKm: options?.endKm ?? summitDistanceKm + 0.5,
	});

	let best: DetectedClimb | null = null;
	let bestDist = Infinity;
	for (const c of climbs) {
		const endM = c.peakDistanceKm * 1000;
		const dist = Math.abs(endM - summitM);
		if (dist <= toleranceM && dist < bestDist) {
			best = c;
			bestDist = dist;
		}
	}

	if (best) {
		return {
			startDistanceKm: best.startDistanceKm,
			endDistanceKm: summitDistanceKm,
			climb: best,
		};
	}

	const backward = estimateClimbRangeBackward(trackPoints, summitDistanceKm);
	return { ...backward, climb: null };
}

function estimateClimbRangeBackward(
	trackPoints: TrackPoint[],
	summitDistanceKm: number,
): { startDistanceKm: number; endDistanceKm: number } {
	const prepared = prepareTrack(trackPoints);
	if (prepared.length < 2) {
		return { startDistanceKm: summitDistanceKm, endDistanceKm: summitDistanceKm };
	}

	const summitM = summitDistanceKm * 1000;
	let peakIdx = 0;
	let minDiff = Infinity;
	for (let i = 0; i < prepared.length; i++) {
		const d = Math.abs(prepared[i].distanceM - summitM);
		if (d < minDiff) {
			minDiff = d;
			peakIdx = i;
		}
	}

	const peakEle = prepared[peakIdx].elevation;
	let startIdx = peakIdx;
	const MIN_RUN_GRADE = 2;

	for (let i = peakIdx; i > 0; i--) {
		const distM = prepared[i].distanceM - prepared[i - 1].distanceM;
		if (distM <= 0) continue;
		const grade =
			((prepared[i].elevation - prepared[i - 1].elevation) / distM) * 100;
		if (grade < -1) break;
		if (prepared[i - 1].elevation >= peakEle - 5 && grade < MIN_RUN_GRADE) {
			const runLengthM = prepared[peakIdx].distanceM - prepared[i - 1].distanceM;
			const runGain = peakEle - prepared[i - 1].elevation;
			const avg = runLengthM > 0 ? (runGain / runLengthM) * 100 : 0;
			if (isWahooClimb(runLengthM, avg)) break;
		}
		startIdx = i - 1;
	}

	return {
		startDistanceKm: prepared[startIdx].distanceM / 1000,
		endDistanceKm: summitDistanceKm,
	};
}

/** 구간 통계 (UI 요약용) */
export function summarizeClimbRange(
	trackPoints: TrackPoint[],
	startDistanceKm: number,
	endDistanceKm: number,
): {
	lengthKm: number;
	elevationGainM: number;
	avgGradePercent: number;
	maxGradePercent: number;
} {
	const segments = computeGradeSegments(trackPoints, { startKm: startDistanceKm, endKm: endDistanceKm });
	const prepared = prepareTrack(trackPoints);
	const startM = startDistanceKm * 1000;
	const endM = endDistanceKm * 1000;

	const startEle = elevationAtDistanceM(prepared, startM) ?? 0;
	const endEle = elevationAtDistanceM(prepared, endM) ?? 0;
	const lengthM = Math.max(0, endM - startM);
	const gain = Math.max(0, endEle - startEle);
	const avgGrade = lengthM > 0 ? (gain / lengthM) * 100 : 0;
	const maxGrade =
		segments.length > 0
			? Math.max(...segments.map((s) => s.gradePercent))
			: 0;

	return {
		lengthKm: Math.round((lengthM / 1000) * 100) / 100,
		elevationGainM: Math.round(gain),
		avgGradePercent: Math.round(avgGrade * 10) / 10,
		maxGradePercent: Math.round(maxGrade * 10) / 10,
	};
}
