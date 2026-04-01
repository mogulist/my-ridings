"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import {
  PLAN_POI_TYPES,
  type PlanPoiRow,
  type PlanPoiType,
} from "@/app/types/planPoi";
import type { NearbyCategoryId } from "./nearbyCategoryId";

const POI_TYPE_LABELS: Record<PlanPoiType, string> = {
  convenience: "편의점",
  mart: "마트",
  accommodation: "숙소",
  cafe: "카페",
  restaurant: "음식점",
};

function categoryToDefaultPoiType(categoryId: NearbyCategoryId): PlanPoiType {
  if (categoryId === "restaurant") return "restaurant";
  if (categoryId === "cafe") return "cafe";
  if (categoryId === "convenience") return "convenience";
  if (categoryId === "mart") return "mart";
  return "accommodation";
}

export type AddPlanPoiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlaceName: string;
  defaultCategoryId: NearbyCategoryId;
  kakaoPlaceId: string;
  lat: number;
  lng: number;
  hasActivePlan: boolean;
  onCreate: (payload: {
    kakao_place_id: string | null;
    name: string;
    poi_type: PlanPoiType;
    memo: string | null;
    lat: number;
    lng: number;
  }) => Promise<PlanPoiRow | null>;
};

export function AddPlanPoiDialog({
  open,
  onOpenChange,
  initialPlaceName,
  defaultCategoryId,
  kakaoPlaceId,
  lat,
  lng,
  hasActivePlan,
  onCreate,
}: AddPlanPoiDialogProps) {
  const titleId = useId();
  const [name, setName] = useState(initialPlaceName);
  const [poiType, setPoiType] = useState<PlanPoiType>(() =>
    categoryToDefaultPoiType(defaultCategoryId),
  );
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialPlaceName);
    setPoiType(categoryToDefaultPoiType(defaultCategoryId));
    setMemo("");
  }, [open, initialPlaceName, defaultCategoryId]);

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

  const handleSave = async () => {
    if (!hasActivePlan) {
      alert("플랜을 먼저 선택해 주세요.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      alert("이름을 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const row = await onCreate({
        kakao_place_id: kakaoPlaceId || null,
        name: trimmed,
        poi_type: poiType,
        memo: memo.trim() || null,
        lat,
        lng,
      });
      if (row) onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:items-center sm:pt-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2
            id={titleId}
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            플랜에 POI 추가
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label
              htmlFor="plan-poi-type"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              타입
            </label>
            <select
              id="plan-poi-type"
              value={poiType}
              onChange={(e) => setPoiType(e.target.value as PlanPoiType)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {PLAN_POI_TYPES.map((t) => (
                <option key={t} value={t}>
                  {POI_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="plan-poi-name"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              이름
            </label>
            <input
              id="plan-poi-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label
              htmlFor="plan-poi-memo"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              메모
            </label>
            <textarea
              id="plan-poi-memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-md border border-orange-500 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 dark:text-orange-400 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {isSaving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
