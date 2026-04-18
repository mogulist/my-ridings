"use client";

import { stageDayLabel } from "@my-ridings/plan-geometry";
import StageCard from "./StageCard";
import AddStageForm from "./AddStageForm";
import type { Stage } from "../types/plan";

/** yyyy-mm-dd → YYYY. M. D. (ko locale order) */
function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return isoDate;
  return `${y}. ${m}. ${d}.`;
}

type PlanStagesPaneProps = {
  planName?: string | null;
  planId?: string | null;
  planStartDate?: string | null;
  stages: Stage[];
  activeStageId: string | null;
  setActiveStageId: (id: string | null) => void;
  /** 디테일 패널에 열린 스테이지 */
  panelStageId: string | null;
  onStageSelect: (stageId: string) => void;
  onEditStage: (stageId: string) => void;
  totalRouteDistanceKm: number;
  unplannedDistanceKm: number;
  updateStageDistance: (stageId: string, newDistanceKm: number) => void;
  requestDeleteStage: (stageId: string) => void;
  addStage: (distanceKm: number) => void;
  addLastStage: () => void;
  isPending?: boolean;
};

export function PlanStagesPane({
  planName,
  planId,
  planStartDate,
  stages,
  activeStageId,
  setActiveStageId,
  panelStageId,
  onStageSelect,
  onEditStage,
  totalRouteDistanceKm,
  unplannedDistanceKm,
  updateStageDistance,
  requestDeleteStage,
  addStage,
  addLastStage,
  isPending = false,
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
          <div className="mt-0.5 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>{stages.length}일 계획</span>
            {planId && (
              <span>
                시작일{" "}
                {planStartDate ? formatDateForDisplay(planStartDate) : "-"}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60">
            <svg
              className="h-5 w-5 animate-spin text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const nextStage = stages[idx + 1];
            const maxDist = nextStage
              ? stage.distanceKm + nextStage.distanceKm - 0.1
              : stage.distanceKm + unplannedDistanceKm;
            const isHighlighted =
              panelStageId === stage.id || activeStageId === stage.id;
            return (
              <StageCard
                key={stage.id}
                stage={stage}
                isHighlighted={isHighlighted}
                onHover={setActiveStageId}
                onSelect={onStageSelect}
                onUpdateDistance={updateStageDistance}
                onDelete={requestDeleteStage}
                onEditStage={onEditStage}
                maxDistanceKm={maxDist}
                dateLabel={stageDayLabel(stage.dayNumber, planStartDate)}
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
