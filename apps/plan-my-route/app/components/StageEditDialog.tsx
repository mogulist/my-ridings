"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { Stage } from "../types/plan";

export type StageEditDialogProps = {
  open: boolean;
  stage: Stage | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    startName: string;
    endName: string;
    memo: string;
  }) => Promise<void>;
};

export function StageEditDialog({
  open,
  stage,
  onOpenChange,
  onSave,
}: StageEditDialogProps) {
  const baseId = useId();
  const [startName, setStartName] = useState("");
  const [endName, setEndName] = useState("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !stage) return;
    setStartName(stage.startName ?? "");
    setEndName(stage.endName ?? "");
    setMemo(stage.memo ?? "");
  }, [open, stage]);

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
    if (!stage || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        startName: startName.trim(),
        endName: endName.trim(),
        memo: memo.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [stage, isSaving, startName, endName, memo, onSave, onOpenChange]);

  if (!open) return null;

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
          스테이지 수정
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              출발 지역
            </span>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="출발 지역을 입력하세요"
              value={startName}
              onChange={(e) => setStartName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              도착 지역
            </span>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="도착 지역을 입력하세요"
              value={endName}
              onChange={(e) => setEndName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              메모
            </span>
            <textarea
              rows={5}
              className="min-h-[120px] w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="스테이지 메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
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
