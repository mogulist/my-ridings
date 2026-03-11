"use client";

import type { PendingDeletion, DeleteConfirmation } from "../hooks/usePlanStages";

// ── 다음 Stage 삭제 확인 다이얼로그 (거리 수정으로 인한) ──────────
interface PendingDeletionDialogProps {
	pending: PendingDeletion;
	onConfirm: () => void;
	onCancel: () => void;
}

export function PendingDeletionDialog({
	pending,
	onConfirm,
	onCancel,
}: PendingDeletionDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					⚠️ 다음 스테이지 삭제
				</h3>
				<p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
					스테이지 {pending.stageDayNumber}의 거리를 변경하면,
					스테이지 {pending.nextStageDayNumber}의 거리가 0 이하가
					됩니다.
				</p>
				<p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
					스테이지 {pending.nextStageDayNumber}을(를) 삭제할까요?
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<button
						onClick={onCancel}
						className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
					>
						취소
					</button>
					<button
						onClick={onConfirm}
						className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
					>
						삭제
					</button>
				</div>
			</div>
		</div>
	);
}

// ── 중간 Stage 삭제 확인 다이얼로그 (방향 선택) ──────────────────
interface DeleteConfirmationDialogProps {
	confirmation: DeleteConfirmation;
	onExecute: (stageId: string, direction: "prev" | "next") => void;
	onCancel: () => void;
}

export function DeleteConfirmationDialog({
	confirmation,
	onExecute,
	onCancel,
}: DeleteConfirmationDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					🗑️ 스테이지 {confirmation.stageDayNumber} 삭제
				</h3>
				<p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
					이 스테이지의 거리 ({confirmation.distanceKm.toFixed(1)}
					km)를 어디에 합산할까요?
				</p>
				<div className="mt-4 flex flex-col gap-2">
					<button
						onClick={() =>
							onExecute(confirmation.stageId, "prev")
						}
						className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						← 이전 스테이지에 합산 (스테이지{" "}
						{confirmation.stageDayNumber - 1})
					</button>
					<button
						onClick={() =>
							onExecute(confirmation.stageId, "next")
						}
						className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						→ 다음 스테이지에 합산 (스테이지{" "}
						{confirmation.stageDayNumber + 1})
					</button>
				</div>
				<div className="mt-3 flex justify-end">
					<button
						onClick={onCancel}
						className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
					>
						취소
					</button>
				</div>
			</div>
		</div>
	);
}
