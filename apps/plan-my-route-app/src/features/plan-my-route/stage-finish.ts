import {
  computeTrackElevationGainLoss,
  snapPlanPoisToTrack,
} from "@my-ridings/plan-geometry";

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
  if (!currentStage || !nextStage || !Number.isFinite(newEndKm)) return null;

  const currentStartKm = (currentStage.start_distance ?? 0) / 1000;
  const currentEndKm = (currentStage.end_distance ?? currentStage.start_distance ?? 0) / 1000;
  const nextEndKm = (nextStage.end_distance ?? nextStage.start_distance ?? 0) / 1000;
  if (newEndKm <= currentStartKm || newEndKm >= currentEndKm || newEndKm >= nextEndKm) {
    return null;
  }

  const currentElevation = computeTrackElevationGainLoss(
    trackPoints,
    currentStartKm,
    newEndKm,
  );
  const nextElevation = computeTrackElevationGainLoss(trackPoints, newEndKm, nextEndKm);
  const poiIdsToMove = snapPlanPoisToTrack(planPois, trackPoints)
    .filter(
      (poi) =>
        poi.assignmentMode === "stage" &&
        poi.stageId === currentStage.id &&
        poi.distanceKm > newEndKm + 1e-6,
    )
    .map((poi) => poi.id);

  return {
    currentStage,
    nextStage,
    currentUpdate: {
      end_distance: newEndKm * 1000,
      elevation_gain: currentElevation.gain,
      elevation_loss: currentElevation.loss,
    },
    nextUpdate: {
      start_distance: newEndKm * 1000,
      elevation_gain: nextElevation.gain,
      elevation_loss: nextElevation.loss,
    },
    poiIdsToMove,
  };
}
