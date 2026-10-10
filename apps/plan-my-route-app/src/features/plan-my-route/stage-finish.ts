import { computeTrackElevationGainLoss } from "@my-ridings/plan-geometry";

import type {
	MobilePlanStageRow,
	PlanPoiRow,
	PutStageBody,
	TrackPoint,
} from "@/features/api/plan-my-route";

export type StageFinishPlan = {
	currentStage: MobilePlanStageRow;
	nextStage: MobilePlanStageRow;
	currentUpdate: PutStageBody;
	nextUpdate: PutStageBody;
	poiIdsToMove: string[];
};

export function buildStageFinishPlan(
	stages: MobilePlanStageRow[],
	currentStageId: string,
	newEndKm: number,
	planPois: PlanPoiRow[],
	trackPoints: TrackPoint[],
): StageFinishPlan | null {
	const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
	const currentStage = stages[currentIndex];
	const nextStage = stages[currentIndex + 1];
	if (
		!currentStage ||
		!nextStage ||
		!Number.isFinite(newEndKm) ||
		!trackPoints.length ||
		currentStage.end_distance !== nextStage.start_distance
	)
		return null;

	const currentStartKm = (currentStage.start_distance ?? 0) / 1000;
	const currentEndKm = (currentStage.end_distance ?? currentStage.start_distance ?? 0) / 1000;
	const nextEndKm = (nextStage.end_distance ?? nextStage.start_distance ?? 0) / 1000;
	if (newEndKm <= currentStartKm || newEndKm >= currentEndKm || newEndKm >= nextEndKm) {
		return null;
	}

	const currentElevation = computeTrackElevationGainLoss(trackPoints, currentStartKm, newEndKm);
	const nextElevation = computeTrackElevationGainLoss(trackPoints, newEndKm, nextEndKm);
	const knownElevation = (start: number, end: number) => {
		const points = trackPoints.filter((p) => Number.isFinite(p.d));
		if (!points.length || points[0].d! > start * 1000 || points[points.length - 1].d! < end * 1000)
			return false;
		for (let i = 1; i < points.length; i++) {
			const a = points[i - 1],
				b = points[i];
			if (b.d! <= start * 1000 || a.d! >= end * 1000) continue;
			if (!Number.isFinite(a.e) || !Number.isFinite(b.e) || b.d! - a.d! > 500) return false;
		}
		return true;
	};
	const currentKnown = knownElevation(currentStartKm, newEndKm),
		nextKnown = knownElevation(newEndKm, nextEndKm);
	const poiIdsToMove = planPois
		.filter((poi) => {
			if (poi.assignment_mode !== "stage" || poi.stage_id !== currentStage.id) return false;
			let nearest: TrackPoint | null = null;
			for (const point of trackPoints) {
				if (point.d == null) continue;
				if (
					!nearest ||
					(point.x - poi.lng) ** 2 + (point.y - poi.lat) ** 2 <
						(nearest.x - poi.lng) ** 2 + (nearest.y - poi.lat) ** 2
				)
					nearest = point;
			}
			return nearest?.d != null && nearest.d / 1000 > newEndKm + 1e-6;
		})
		.map((p) => p.id);

	return {
		currentStage,
		nextStage,
		currentUpdate: {
			end_distance: newEndKm * 1000,
			elevation_gain: currentKnown ? currentElevation.gain : null,
			elevation_loss: currentKnown ? currentElevation.loss : null,
		},
		nextUpdate: {
			start_distance: newEndKm * 1000,
			elevation_gain: nextKnown ? nextElevation.gain : null,
			elevation_loss: nextKnown ? nextElevation.loss : null,
		},
		poiIdsToMove,
	};
}

export function parseStageFinishKm(value: string): number | null {
	const trimmed = value.trim();
	if (!/^\d+(?:\.\d{1,3})?$/.test(trimmed)) return null;
	const km = Number(trimmed);
	return Number.isFinite(km) ? km : null;
}
