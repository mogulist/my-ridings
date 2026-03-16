"use client";

import { useState, useCallback, useEffect } from "react";
import { XIcon, SaveIcon } from "lucide-react";
import { getStageColor } from "../types/plan";
import type { Stage } from "../types/plan";

type MemoPaneProps = {
  stage: Stage;
  dateLabel?: string;
  onClose: () => void;
  onSave: (stageId: string, memo: string) => void;
};

export function MemoPane({ stage, dateLabel, onClose, onSave }: MemoPaneProps) {
  const [memo, setMemo] = useState(stage.memo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const color = getStageColor(stage.dayNumber);

  useEffect(() => {
    setMemo(stage.memo ?? "");
  }, [stage.id, stage.memo]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/stages/${stage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) throw new Error("Failed to save memo");
      onSave(stage.id, memo);
    } catch {
      alert("메모 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [stage.id, memo, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    },
    [handleSave],
  );

  return (
    <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: color.stroke }}
          >
            {stage.dayNumber}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              스테이지 {stage.dayNumber} 메모
            </span>
            {dateLabel && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {dateLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="메모 닫기"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 텍스트 에리어 */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <textarea
          className="flex-1 resize-none rounded-lg border border-zinc-200 bg-transparent p-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          placeholder="이 스테이지에 대한 메모를 입력하세요...&#10;&#10;Cmd+Enter로 저장"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {/* 저장 버튼 */}
      <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <SaveIcon className="h-4 w-4" />
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
