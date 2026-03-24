"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CopyIcon,
  GripVertical,
  Share2Icon,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@my-ridings/ui";
import { RouteSummaryBlock } from "./RouteSummaryBlock";

type PlanItem = {
  id: string;
  name: string;
  stages?: unknown[];
  start_date?: string | null;
  public_share_token?: string | null;
  shared_at?: string | null;
};

type RouteSummary = {
  name: string;
  rwgpsUrl: string;
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
};

type PlanListPaneProps = {
  routeSummary?: RouteSummary | null;
  plans: PlanItem[];
  activePlanId: string | null;
  isReorderingPlans?: boolean;
  onSelectPlan: (planId: string) => void;
  onUpdatePlan?: (planId: string, newName: string) => void;
  onUpdatePlanStartDate?: (planId: string, startDate: string | null) => void;
  onDuplicatePlan?: (plan: PlanItem) => void;
  onDeletePlan?: (planId: string) => void;
  onTogglePlanShare?: (planId: string, enabled: boolean) => void;
  onCopyPlanShareLink?: (token: string) => void;
  onReorderPlans?: (planIds: string[]) => void;
  newPlanName: string;
  setNewPlanName: (value: string) => void;
  onSubmitNewPlan: (e: React.FormEvent) => void;
  isCreatingPlan: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

/** yyyy-mm-dd → YYYY. M. D. (ko locale order) */
function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return isoDate;
  return `${y}. ${m}. ${d}.`;
}

type SortablePlanRowProps = {
  plan: PlanItem;
  isActive: boolean;
  showActions: boolean;
  openMenuPlanId: string | null;
  setOpenMenuPlanId: (id: string | null) => void;
  onSelectPlan: (planId: string) => void;
  onStartEdit: (plan: PlanItem) => void;
  onRequestDelete: (planId: string) => void;
  onDuplicatePlan?: (plan: PlanItem) => void;
  onUpdatePlan?: (planId: string, newName: string) => void;
  onDeletePlan?: (planId: string) => void;
  onTogglePlanShare?: (planId: string, enabled: boolean) => void;
  onCopyPlanShareLink?: (token: string) => void;
};

function SortablePlanRow({
  plan,
  isActive,
  showActions,
  openMenuPlanId,
  setOpenMenuPlanId,
  onSelectPlan,
  onStartEdit,
  onRequestDelete,
  onDuplicatePlan,
  onUpdatePlan,
  onDeletePlan,
  onTogglePlanShare,
  onCopyPlanShareLink,
}: SortablePlanRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stageCount = plan.stages?.length ?? 0;
  const hasShareLink = Boolean(plan.public_share_token);

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => onSelectPlan(plan.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPlan(plan.id);
        }
      }}
      className={`flex cursor-pointer items-start gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        isDragging
          ? "opacity-50 shadow-md"
          : isActive
            ? "border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/40"
            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      }`}
    >
      <button
        type="button"
        className="touch-none shrink-0 cursor-grab active:cursor-grabbing rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className={`min-w-0 flex-1 text-left ${
          isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        <div className="font-medium">{plan.name}</div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {stageCount > 0 ? `${stageCount}일 계획` : "스테이지 없음"}
          {hasShareLink ? " · 공유중" : ""}
        </div>
      </div>
      {showActions && (
        <DropdownMenu
          open={openMenuPlanId === plan.id}
          onOpenChange={(open) => setOpenMenuPlanId(open ? plan.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded"
              onClick={(e) => e.stopPropagation()}
              aria-label="플랜 메뉴"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {onUpdatePlan && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMenuPlanId(null);
                  onStartEdit(plan);
                }}
              >
                <PencilIcon className="h-4 w-4" />
                수정
              </DropdownMenuItem>
            )}
            {onDuplicatePlan && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMenuPlanId(null);
                  onDuplicatePlan(plan);
                }}
              >
                <CopyIcon className="h-4 w-4" />
                복제
              </DropdownMenuItem>
            )}
            {onTogglePlanShare && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMenuPlanId(null);
                  onTogglePlanShare(plan.id, !hasShareLink);
                }}
              >
                <Share2Icon className="h-4 w-4" />
                {hasShareLink ? "공개 해제" : "공개 링크 생성"}
              </DropdownMenuItem>
            )}
            {plan.public_share_token && onCopyPlanShareLink && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMenuPlanId(null);
                  const shareToken = plan.public_share_token;
                  if (!shareToken) return;
                  onCopyPlanShareLink(shareToken);
                }}
              >
                <CopyIcon className="h-4 w-4" />
                링크 복사
              </DropdownMenuItem>
            )}
            {(onUpdatePlan || onDuplicatePlan || onTogglePlanShare || onCopyPlanShareLink) &&
              onDeletePlan && (
              <DropdownMenuSeparator />
            )}
            {onDeletePlan && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMenuPlanId(null);
                  onRequestDelete(plan.id);
                }}
              >
                <TrashIcon className="h-4 w-4" />
                삭제
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function PlanListPane({
  routeSummary,
  plans,
  activePlanId,
  isReorderingPlans = false,
  onSelectPlan,
  onUpdatePlan,
  onDuplicatePlan,
  onDeletePlan,
  onTogglePlanShare,
  onCopyPlanShareLink,
  onUpdatePlanStartDate,
  onReorderPlans,
  newPlanName,
  setNewPlanName,
  onSubmitNewPlan,
  isCreatingPlan,
  isCollapsed,
  onToggleCollapse,
}: PlanListPaneProps) {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [deleteConfirmPlanId, setDeleteConfirmPlanId] = useState<string | null>(
    null,
  );
  const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = useCallback((plan: PlanItem) => {
    setEditingPlanId(plan.id);
    setEditName(plan.name);
    setEditStartDate(plan.start_date ?? "");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingPlanId) return;
    if (editName.trim() && onUpdatePlan) {
      onUpdatePlan(editingPlanId, editName.trim());
    }
    if (onUpdatePlanStartDate) {
      onUpdatePlanStartDate(editingPlanId, editStartDate || null);
    }
    setEditingPlanId(null);
    setEditName("");
    setEditStartDate("");
  }, [
    editingPlanId,
    editName,
    editStartDate,
    onUpdatePlan,
    onUpdatePlanStartDate,
  ]);

  const handleCancelEdit = useCallback(() => {
    setEditingPlanId(null);
    setEditName("");
    setEditStartDate("");
  }, []);

  const handleRequestDelete = useCallback((planId: string) => {
    setDeleteConfirmPlanId(planId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmPlanId && onDeletePlan) {
      onDeletePlan(deleteConfirmPlanId);
    }
    setDeleteConfirmPlanId(null);
  }, [deleteConfirmPlanId, onDeletePlan]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (isReorderingPlans) return;
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorderPlans) return;
      const oldIndex = plans.findIndex((p) => p.id === active.id);
      const newIndex = plans.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(plans, oldIndex, newIndex);
      onReorderPlans(reordered.map((p) => p.id));
    },
    [isReorderingPlans, plans, onReorderPlans],
  );

  const editingPlan = editingPlanId
    ? plans.find((p) => p.id === editingPlanId)
    : null;
  const deleteConfirmPlan = deleteConfirmPlanId
    ? plans.find((p) => p.id === deleteConfirmPlanId)
    : null;

  if (isCollapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-10 w-full items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="플랜 목록 펼치기"
          aria-label="플랜 목록 펼치기"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 px-2 dark:border-zinc-700">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          플랜
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="플랜 목록 접기"
          aria-label="플랜 목록 접기"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        {routeSummary && (
          <RouteSummaryBlock
            name={routeSummary.name}
            rwgpsUrl={routeSummary.rwgpsUrl}
            distanceMeters={routeSummary.distanceKm * 1000}
            elevationGain={routeSummary.elevationGain}
            elevationLoss={routeSummary.elevationLoss}
          />
        )}
        <div className="relative">
          {isReorderingPlans && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/60 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2 rounded bg-white px-2.5 py-1.5 text-xs text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                <svg
                  className="h-3.5 w-3.5 animate-spin text-orange-500"
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
                저장 중...
              </div>
            </div>
          )}
          <div
            className={`space-y-2 ${isReorderingPlans ? "pointer-events-none opacity-70" : ""}`}
          >
          {plans.length === 0 ? (
            <p className="text-xs text-zinc-500">생성된 플랜이 없습니다.</p>
          ) : (
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={plans.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {plans.map((plan) => (
                  <SortablePlanRow
                    key={plan.id}
                    plan={plan}
                    isActive={activePlanId === plan.id}
                    showActions={Boolean(
                      onUpdatePlan ||
                        onDuplicatePlan ||
                        onDeletePlan ||
                        onTogglePlanShare ||
                        onCopyPlanShareLink,
                    )}
                    openMenuPlanId={openMenuPlanId}
                    setOpenMenuPlanId={setOpenMenuPlanId}
                    onSelectPlan={onSelectPlan}
                    onStartEdit={handleStartEdit}
                    onRequestDelete={handleRequestDelete}
                    onDuplicatePlan={onDuplicatePlan}
                    onUpdatePlan={onUpdatePlan}
                    onDeletePlan={onDeletePlan}
                    onTogglePlanShare={onTogglePlanShare}
                    onCopyPlanShareLink={onCopyPlanShareLink}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          </div>
        </div>
        <form
          onSubmit={onSubmitNewPlan}
          className="mt-3 flex gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700"
        >
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="새 플랜 이름"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
          <button
            type="submit"
            disabled={isCreatingPlan || !newPlanName.trim()}
            className="rounded bg-zinc-800 px-2 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            추가
          </button>
        </form>
      </div>

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              플랜 수정
            </h3>
            <label className="mt-3 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              이름
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="플랜 이름"
              autoFocus
            />
            {onUpdatePlanStartDate && (
              <div className="relative">
                <label className="mt-3 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  라이딩 시작일
                </label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="absolute left-0 top-0 h-0 w-0 opacity-0 pointer-events-none"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() =>
                    dateInputRef.current?.showPicker?.() ??
                    dateInputRef.current?.click()
                  }
                  className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-left text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {editStartDate
                    ? formatDateForDisplay(editStartDate)
                    : "날짜 선택"}
                </button>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              플랜 삭제
            </h3>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              &quot;{deleteConfirmPlan.name}&quot; 플랜을 삭제하시겠습니까?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlanId(null)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
