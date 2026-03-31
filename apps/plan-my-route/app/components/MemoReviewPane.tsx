"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { getStageColor } from "../types/plan";
import type { Stage } from "../types/plan";
import { useAutoResizeTextarea } from "../hooks/useAutoResizeTextarea";
import { stageDayLabel } from "./PlanStagesPane";

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

type MemoReviewPaneProps = {
  stages: Stage[];
  planStartDate: string | null | undefined;
  onClose: () => void;
  onSaveMemo?: (stageId: string, memo: string) => void;
  readOnly?: boolean;
};

export function MemoReviewPane({
  stages,
  planStartDate,
  onClose,
  onSaveMemo,
  readOnly = false,
}: MemoReviewPaneProps) {
  const memoCount = stages.filter((s) => (s.memo ?? "").trim().length > 0).length;

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      style={{ width: "30rem", minWidth: "30rem" }}
    >
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            메모 리뷰
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="메모 리뷰 닫기"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {memoCount}/{stages.length} 스테이지에 메모 작성됨
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {stages.map((stage) => (
            <MemoReviewStageCard
              key={stage.id}
              stage={stage}
              dateLabel={stageDayLabel(stage.dayNumber, planStartDate)}
              onSaveMemo={onSaveMemo}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type MemoReviewStageCardProps = {
  stage: Stage;
  dateLabel: string;
  onSaveMemo?: (stageId: string, memo: string) => void;
  readOnly?: boolean;
};

function MemoReviewStageCard({
  stage,
  dateLabel,
  onSaveMemo,
  readOnly = false,
}: MemoReviewStageCardProps) {
  const [draft, setDraft] = useState(stage.memo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const color = getStageColor(stage.dayNumber);

  useEffect(() => {
    setDraft(stage.memo ?? "");
  }, [stage.id, stage.memo]);
  const textareaRef = useAutoResizeTextarea({
    value: draft,
    minHeightPx: 40,
    maxHeightPx: 160,
  });

  const save = useCallback(async () => {
    const value = draft.trim();
    if (readOnly || !onSaveMemo) return;
    if (value === (stage.memo ?? "") || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/stages/${stage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: value || null }),
      });
      if (!res.ok) throw new Error("Failed to save memo");
      onSaveMemo(stage.id, value);
    } catch {
      alert("메모 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [stage.id, stage.memo, draft, onSaveMemo, isSaving, readOnly]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    },
    [save],
  );

  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color.stroke }}
        >
          {stage.dayNumber}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {dateLabel}
        </span>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {formatNumber(stage.distanceKm)}km
        </span>
        <span className="text-xs text-green-600 dark:text-green-400">
          +{formatNumber(stage.elevationGain)}m
        </span>
      </div>
      {readOnly ? (
        <div className="min-h-[2.5rem] whitespace-pre-wrap rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {(stage.memo ?? "").trim() || "메모 없음"}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="min-h-[2.5rem] w-full resize-none overflow-y-auto rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          placeholder="메모를 입력하세요..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          rows={2}
        />
      )}
    </div>
  );
}
