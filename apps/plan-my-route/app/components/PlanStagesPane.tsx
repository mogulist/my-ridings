"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function stageDayLabel(
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

type PlanStagesPaneProps = {
  planName?: string | null;
  planId?: string | null;
  planStartDate?: string | null;
  onUpdatePlanStartDate?: (startDate: string | null) => void;
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
  planId,
  planStartDate,
  onUpdatePlanStartDate,
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
  const [localStartDate, setLocalStartDate] = useState(planStartDate ?? "");
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalStartDate(planStartDate ?? "");
  }, [planStartDate]);

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || "";
      setLocalStartDate(value);
      onUpdatePlanStartDate?.(value || null);
    },
    [onUpdatePlanStartDate],
  );

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
        {planId && (
          <div className="relative mt-2">
            <label className="block text-xs text-zinc-500 dark:text-zinc-400">
              시작일
            </label>
            <input
              ref={dateInputRef}
              type="date"
              value={localStartDate}
              onChange={handleStartDateChange}
              className="absolute left-0 top-0 h-0 w-0 opacity-0 pointer-events-none"
              aria-hidden
            />
            <button
              type="button"
              onClick={() =>
                dateInputRef.current?.showPicker?.() ??
                dateInputRef.current?.click()
              }
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-left text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {localStartDate
                ? formatDateForDisplay(localStartDate)
                : "날짜 선택"}
            </button>
          </div>
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
