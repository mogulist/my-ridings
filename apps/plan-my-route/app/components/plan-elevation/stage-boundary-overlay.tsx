"use client";

import type { RefObject } from "react";
import type { PendingStageEdit } from "@/app/hooks/usePlanStages";
import type { Stage } from "@/app/types/plan";
import {
	STAGE_END_BOUNDARY_HIT_STRIP_PX,
	STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX,
} from "./chart-layout";
import { BoundaryTooltip } from "./tooltips";
import type { PreviewStageStats } from "./types";

export type StageBoundaryOverlayProps = {
	selectedStage: Stage;
	stageEndBoundaryHitLeftPct: number;
	stageEndBoundaryChartEditMode: boolean;
	stageEndBoundaryMenuAnchor: { leftPx: number; topPx: number } | null;
	stageEndBoundaryMenuPosition: { left: number; top: "50%" } | null;
	onHoverBoundary: (hovering: boolean) => void;
	onDismissMenu: () => void;
	onOpenMenuAnchor: (anchor: { leftPx: number; topPx: number }) => void;
	onStartBoundaryDrag?: (stageId: string, originalEndKm: number) => void;
	onStageEndBoundaryEditMapCenter?: (distanceKm: number) => void;
	beginBoundaryWindowDrag: (clientX: number, pointerId: number) => void;
	pendingStageEdit: PendingStageEdit | null;
	pendingStage: Stage | null;
	previewStageStats: PreviewStageStats | null;
	boundaryKmForHandle: number;
	visibleStart: number;
	visibleEnd: number;
	stageEndBoundaryHitStripRef: RefObject<HTMLButtonElement | null>;
	stageEndBoundaryMenuRef: RefObject<HTMLDivElement | null>;
	chartContainerRef: RefObject<HTMLDivElement | null>;
};

export function StageBoundaryOverlay({
	selectedStage,
	stageEndBoundaryHitLeftPct,
	stageEndBoundaryChartEditMode,
	stageEndBoundaryMenuAnchor,
	stageEndBoundaryMenuPosition,
	onHoverBoundary,
	onDismissMenu,
	onOpenMenuAnchor,
	onStartBoundaryDrag,
	onStageEndBoundaryEditMapCenter,
	beginBoundaryWindowDrag,
	pendingStageEdit,
	pendingStage,
	previewStageStats,
	boundaryKmForHandle,
	visibleStart,
	visibleEnd,
	stageEndBoundaryHitStripRef,
	stageEndBoundaryMenuRef,
	chartContainerRef,
}: StageBoundaryOverlayProps) {
	return (
		<>
			<button
				ref={stageEndBoundaryHitStripRef}
				type="button"
				aria-label={
					stageEndBoundaryChartEditMode
						? "스테이지 종료 지점"
						: "스테이지 종료 지점 메뉴 열기"
				}
				aria-expanded={!stageEndBoundaryChartEditMode && stageEndBoundaryMenuAnchor != null}
				aria-haspopup={stageEndBoundaryChartEditMode ? undefined : "dialog"}
				className="absolute inset-y-0 z-9 -translate-x-1/2 cursor-ew-resize border-0 bg-transparent p-0"
				style={{
					left: `${stageEndBoundaryHitLeftPct}%`,
					width: STAGE_END_BOUNDARY_HIT_STRIP_PX,
				}}
				onMouseEnter={() => onHoverBoundary(true)}
				onMouseLeave={() => onHoverBoundary(false)}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					e.preventDefault();
					e.stopPropagation();
					if (stageEndBoundaryChartEditMode) {
						if (!pendingStageEdit) {
							onStartBoundaryDrag?.(selectedStage.id, selectedStage.endDistanceKm);
						}
						try {
							(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
						} catch {
							/* noop */
						}
						beginBoundaryWindowDrag(e.clientX, e.pointerId);
						return;
					}
					if (stageEndBoundaryMenuAnchor != null) {
						onDismissMenu();
						return;
					}
					const root = chartContainerRef.current;
					if (!root) return;
					const r = root.getBoundingClientRect();
					onOpenMenuAnchor({
						leftPx: e.clientX - r.left,
						topPx: e.clientY - r.top,
					});
				}}
			/>
			{stageEndBoundaryMenuPosition != null ? (
				<div
					ref={stageEndBoundaryMenuRef}
					role="dialog"
					aria-modal="true"
					aria-labelledby="stage-end-boundary-menu-title"
					className="absolute z-20 w-[232px] rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
					style={{
						left: stageEndBoundaryMenuPosition.left,
						top: stageEndBoundaryMenuPosition.top,
						transform: `translateX(calc(-100% - ${STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX}px)) translateY(-50%)`,
					}}
				>
					<p
						id="stage-end-boundary-menu-title"
						className="font-medium text-zinc-800 dark:text-zinc-100"
					>
						종료 지점을 수정하시겠습니까?
					</p>
					<div className="mt-3 flex justify-end gap-2">
						<button
							type="button"
							className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
							onClick={onDismissMenu}
						>
							취소
						</button>
						<button
							type="button"
							className="rounded bg-orange-500 px-2 py-1 font-medium text-white hover:bg-orange-600"
							onClick={() => {
								onStartBoundaryDrag?.(selectedStage.id, selectedStage.endDistanceKm);
								onStageEndBoundaryEditMapCenter?.(boundaryKmForHandle);
								onDismissMenu();
							}}
						>
							수정
						</button>
					</div>
				</div>
			) : null}
			{pendingStageEdit && pendingStage ? (
				<BoundaryTooltip
					stage={pendingStage}
					originalEndKm={pendingStageEdit.originalEndKm}
					previewEndKm={pendingStageEdit.previewEndKm}
					previewStats={previewStageStats}
					leftPct={
						visibleEnd > visibleStart
							? ((boundaryKmForHandle - visibleStart) / (visibleEnd - visibleStart)) * 100
							: 50
					}
				/>
			) : null}
		</>
	);
}
