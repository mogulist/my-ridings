import { fromTrackPoints } from "@my-ridings/elevation-profile";
import type { ProfilePoint } from "@my-ridings/elevation-profile";
import { computeElevationGainCurve } from "@my-ridings/plan-geometry";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { Stage } from "@/app/types/plan";

export type ChartDatum = {
	distanceKm: number;
	ele: number;
	index: number;
	/** 이 포인트가 속한 Stage 번호 (없으면 미계획) */
	stageIndex: number | null;
	/** 현재 스테이지 출발점 기준 거리(km). stageIndex 있을 때만 */
	distanceFromStageStartKm?: number;
	/** 현재 스테이지 출발점 기준 누적 상승고도(m). stageIndex 있을 때만 */
	elevationGainFromStageStart?: number;
};

type GainCurve = { distanceM: number; gain: number }[];

function lookupGainAtDistanceKm(curve: GainCurve, distanceKm: number): number {
	if (curve.length === 0) return 0;
	const distanceM = distanceKm * 1000;
	let j = curve.length - 1;
	while (j >= 0 && curve[j].distanceM > distanceM) j--;
	return j >= 0 ? curve[j].gain : 0;
}

function findFirstProfileIndexAtOrAfter(
	profilePoints: ProfilePoint[],
	distanceKm: number,
): number {
	const idx = profilePoints.findIndex((p) => p.distanceKm >= distanceKm);
	return idx === -1 ? profilePoints.length - 1 : idx;
}

/** stage 경계 인덱스를 보존하며 ProfilePoint[] 샘플링 */
export function sampleProfilePoints(
	profilePoints: ProfilePoint[],
	stages: Stage[],
	maxSamples: number,
): ProfilePoint[] {
	if (profilePoints.length === 0) return [];
	if (profilePoints.length <= maxSamples) return profilePoints;

	const step = Math.max(1, Math.ceil(profilePoints.length / maxSamples));
	const sampledIndexSet = new Set<number>();
	for (let i = 0; i < profilePoints.length; i += step) sampledIndexSet.add(i);
	sampledIndexSet.add(profilePoints.length - 1);

	for (const stage of stages) {
		const startIdx = findFirstProfileIndexAtOrAfter(profilePoints, stage.startDistanceKm);
		const endIdx = findFirstProfileIndexAtOrAfter(profilePoints, stage.endDistanceKm);
		sampledIndexSet.add(startIdx);
		sampledIndexSet.add(endIdx);
		if (startIdx > 0) sampledIndexSet.add(startIdx - 1);
		if (endIdx > 0) sampledIndexSet.add(endIdx - 1);
	}

	return [...sampledIndexSet]
		.filter((idx) => idx >= 0 && idx < profilePoints.length)
		.sort((a, b) => a - b)
		.map((idx) => profilePoints[idx]);
}

/** ProfilePoint[]에 plan-my-route 전용 stage 필드를 합성 */
export function enrichWithStageFields(
	profilePoints: ProfilePoint[],
	points: TrackPoint[],
	stages: Stage[],
	elevationCalibratedThreshold?: number,
): ChartDatum[] {
	const useSmoothedGain =
		typeof elevationCalibratedThreshold === "number" &&
		elevationCalibratedThreshold >= 0 &&
		stages.length > 0;

	const stageGainCurves: GainCurve[] = useSmoothedGain
		? stages.map((stage) =>
				computeElevationGainCurve(
					points,
					stage.startDistanceKm,
					stage.endDistanceKm,
					elevationCalibratedThreshold,
				),
			)
		: [];

	const cumulativeGain: number[] = [];
	if (!useSmoothedGain) {
		for (let i = 0; i < profilePoints.length; i++) {
			if (i === 0) {
				cumulativeGain.push(0);
			} else {
				const prev = profilePoints[i - 1].elevationM;
				const curr = profilePoints[i].elevationM;
				cumulativeGain.push(cumulativeGain[i - 1] + Math.max(0, curr - prev));
			}
		}
	}

	const stageStartIndices: number[] = stages.map((stage) => {
		const idx = profilePoints.findIndex((p) => p.distanceKm >= stage.startDistanceKm);
		return idx === -1 ? profilePoints.length : idx;
	});

	return profilePoints.map((point, profileIndex) => {
		const rawDistanceKm = point.distanceKm;
		const distanceKm = Math.round(rawDistanceKm * 100) / 100;
		let stageIndex: number | null = null;
		for (let i = 0; i < stages.length; i++) {
			if (rawDistanceKm >= stages[i].startDistanceKm && rawDistanceKm <= stages[i].endDistanceKm) {
				stageIndex = i;
				break;
			}
		}

		const datum: ChartDatum = {
			distanceKm,
			ele: Math.round(point.elevationM),
			index: point.sourceIndex,
			stageIndex,
		};

		if (stageIndex !== null) {
			const stage = stages[stageIndex];
			datum.distanceFromStageStartKm =
				Math.round((rawDistanceKm - stage.startDistanceKm) * 100) / 100;
			if (useSmoothedGain && stageGainCurves[stageIndex]) {
				datum.elevationGainFromStageStart = lookupGainAtDistanceKm(
					stageGainCurves[stageIndex],
					rawDistanceKm,
				);
			} else {
				const startIdx = stageStartIndices[stageIndex];
				datum.elevationGainFromStageStart = Math.round(
					startIdx < profileIndex ? cumulativeGain[profileIndex] - cumulativeGain[startIdx] : 0,
				);
			}
		}

		return datum;
	});
}

export function buildChartData(
	points: TrackPoint[],
	stages: Stage[],
	elevationCalibratedThreshold?: number,
	maxSamples = 2000,
): ChartDatum[] {
	const validCount = points.filter((p) => p.e != null && p.d != null).length;
	if (validCount === 0) return [];

	const allProfile = fromTrackPoints(points, Math.max(validCount, maxSamples));
	const sampled = sampleProfilePoints(allProfile, stages, maxSamples);
	return enrichWithStageFields(sampled, points, stages, elevationCalibratedThreshold);
}
