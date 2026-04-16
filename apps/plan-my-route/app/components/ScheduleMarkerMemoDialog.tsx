"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { StageScheduleMarkerKind } from "../types/stageScheduleWaypoint";

export type ScheduleMarkerMemoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowKey: string | null;
  markerKind: StageScheduleMarkerKind | null;
  name: string;
  categoryLabel: string;
  initialMemo: string;
  onSave: (payload: { rowKey: string; memo: string }) => Promise<void>;
};

function kindLabel(kind: StageScheduleMarkerKind | null): string {
  if (kind === "cp") return "체크포인트";
  if (kind === "summit") return "정상";
  return "경유 지점";
}

export function ScheduleMarkerMemoDialog({
  open,
  onOpenChange,
  rowKey,
  markerKind,
  name,
  categoryLabel,
  initialMemo,
  onSave,
}: ScheduleMarkerMemoDialogProps) {
  const baseId = useId();
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMemo(initialMemo);
  }, [open, initialMemo]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    onOpenChange(false);
  }, [isSaving, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const handleSave = useCallback(async () => {
    if (!rowKey || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({ rowKey, memo: memo.trim() });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [rowKey, isSaving, memo, onSave, onOpenChange]);

  if (!open || !rowKey || (markerKind !== "cp" && markerKind !== "summit")) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        aria-labelledby={`${baseId}-title`}
        className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id={`${baseId}-title`}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {kindLabel(markerKind)} 메모
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{name}</p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              메모
            </span>
            <textarea
              rows={4}
              className="min-h-[96px] w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="이 지점에 대한 메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
          <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <p>유형 {categoryLabel}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSaving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
