"use client";

import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import StageCard from "./StageCard";
import AddStageForm from "./AddStageForm";
import type { Stage } from "../types/plan";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

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
  totalRouteDistanceKm: number;
  unplannedDistanceKm: number;
  updateStageDistance: (stageId: string, newDistanceKm: number) => void;
  requestDeleteStage: (stageId: string) => void;
  addStage: (distanceKm: number) => void;
  addLastStage: () => void;
  isPending?: boolean;
  onMemoClick?: (stageId: string) => void;
  memoExpandedStageIds?: Set<string>;
  onToggleMemoExpand?: (stageId: string) => void;
  onExpandAllMemos?: () => void;
  onCollapseAllMemos?: () => void;
  onSaveMemo?: (stageId: string, memo: string) => void;
  onMemoReviewClick?: () => void;
  readOnly?: boolean;
};

export function stageDayLabel(
  dayNumber: number,
  planStartDate: string | null | undefined,
): string {
  if (!planStartDate) return "";
  const start = new Date(planStartDate + "T12:00:00");
  if (Number.isNaN(start.getTime())) return "";
  const d = new Date(start);
  d.setDate(d.getDate() + (dayNumber - 1));
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_LABELS[d.getDay()];
  return `${m}.${day}(${w})`;
}

export function PlanStagesPane({
  planName,
  planId,
  planStartDate,
  stages,
  activeStageId,
  setActiveStageId,
  totalRouteDistanceKm,
  unplannedDistanceKm,
  updateStageDistance,
  requestDeleteStage,
  addStage,
  addLastStage,
  isPending = false,
  onMemoClick,
  memoExpandedStageIds = new Set(),
  onToggleMemoExpand,
  onExpandAllMemos,
  onCollapseAllMemos,
  onSaveMemo,
  onMemoReviewClick,
  readOnly = false,
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
        {stages.length > 0 &&
          onExpandAllMemos &&
          onCollapseAllMemos &&
          (() => {
            const allExpanded =
              stages.length > 0 &&
              stages.every((s) => memoExpandedStageIds.has(s.id));
            return (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={allExpanded ? onCollapseAllMemos : onExpandAllMemos}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  {allExpanded ? (
                    <>
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                      전체 메모 접기
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                      전체 메모 펼치기
                    </>
                  )}
                </button>
                {!readOnly && onMemoReviewClick && (
                  <button
                    type="button"
                    onClick={onMemoReviewClick}
                    className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <BookOpenIcon className="h-3.5 w-3.5" />
                    메모 리뷰
                  </button>
                )}
              </div>
            );
          })()}
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
            return (
              <StageCard
                key={stage.id}
                stage={stage}
                isActive={activeStageId === stage.id}
                onHover={setActiveStageId}
                onUpdateDistance={updateStageDistance}
                onDelete={requestDeleteStage}
                maxDistanceKm={maxDist}
                dateLabel={stageDayLabel(stage.dayNumber, planStartDate)}
                onMemoClick={onMemoClick}
                isMemoExpanded={memoExpandedStageIds.has(stage.id)}
                onToggleMemoExpand={
                  onToggleMemoExpand
                    ? () => onToggleMemoExpand(stage.id)
                    : undefined
                }
                onSaveMemo={onSaveMemo}
                readOnly={readOnly}
              />
            );
          })}
        </div>
        {!readOnly && (
          <AddStageForm
            unplannedDistanceKm={unplannedDistanceKm}
            onAddStage={addStage}
            onAddLastStage={addLastStage}
            nextDayNumber={stages.length + 1}
          />
        )}
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
