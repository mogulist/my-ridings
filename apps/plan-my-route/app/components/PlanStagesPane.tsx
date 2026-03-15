"use client";

import StageCard from "./StageCard";
import AddStageForm from "./AddStageForm";
import type { Stage } from "../types/plan";

type PlanStagesPaneProps = {
  planName?: string | null;
  stages: Stage[];
  activeStageId: string | null;
  setActiveStageId: (id: string | null) => void;
  totalRouteDistanceKm: number;
  unplannedDistanceKm: number;
  updateStageDistance: (stageId: string, newDistanceKm: number) => void;
  requestDeleteStage: (stageId: string) => void;
  addStage: (distanceKm: number) => void;
  addLastStage: () => void;
};

export function PlanStagesPane({
  planName,
  stages,
  activeStageId,
  setActiveStageId,
  totalRouteDistanceKm,
  unplannedDistanceKm,
  updateStageDistance,
  requestDeleteStage,
  addStage,
  addLastStage,
}: PlanStagesPaneProps) {
  const progressPercent =
    totalRouteDistanceKm > 0
      ? ((totalRouteDistanceKm - unplannedDistanceKm) / totalRouteDistanceKm) *
        100
      : 0;

  return (
    <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {planName ? `${planName} — 스테이지` : "스테이지"}
        </h3>
        {stages.length > 0 && (
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            {stages.length}일 계획
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const nextStage = stages[idx + 1];
            const maxDist = nextStage
              ? stage.distanceKm + nextStage.distanceKm - 0.1
              : stage.distanceKm + unplannedDistanceKm;
            return (
              <StageCard
                key={stage.id}
                stage={stage}
                isActive={activeStageId === stage.id}
                onHover={setActiveStageId}
                onUpdateDistance={updateStageDistance}
                onDelete={requestDeleteStage}
                maxDistanceKm={maxDist}
              />
            );
          })}
        </div>
        <AddStageForm
          unplannedDistanceKm={unplannedDistanceKm}
          onAddStage={addStage}
          onAddLastStage={addLastStage}
          nextDayNumber={stages.length + 1}
        />
        {stages.length > 0 && (
          <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>계획 진행률</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
