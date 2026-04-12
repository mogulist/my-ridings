"use client";

import { PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { useMemo } from "react";
import type { Stage } from "../types/plan";
import { getStageColor } from "../types/plan";
import type { PlanPoiRow } from "../types/planPoi";
import { DotsMenu } from "./DotsMenu";
import type { CPOnRoute, SummitOnRoute, TrackPoint } from "./ElevationProfile";
import {
	maxElevationInStageRange,
	type SnappedPlanPoi,
	snapPlanPoisToTrack,
	stageScheduleWaypoints,
} from "./MobileSharedPlanStagesTab";
import { StageScheduleWaypointList } from "./StageScheduleWaypointList";

type StageDetailPanelProps = {
	stage: Stage | null;
	dateLabel: string;
	trackPoints: TrackPoint[];
	/** usePlanStages / 공유뷰에서 calibrateThreshold 결과 */
	elevationCalibratedThreshold: number;
	planPois: PlanPoiRow[];
	cpMarkers?: CPOnRoute[];
	summitMarkers?: SummitOnRoute[];
	onClose: () => void;
	onEditStage: () => void;
	onDeleteStage: (stageId: string) => void;
	onPoiRowClick: (poiId: string) => void;
	onEditPoi: (poi: SnappedPlanPoi) => void;
	onDeletePoi: (poiId: string) => void;
	/** 공유 뷰 등: 수정·삭제 UI 숨김 */
	readOnly?: boolean;
};

function formatNumber(n: number): string {
	return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

export function StageDetailPanel({
	stage,
	dateLabel,
	trackPoints,
	elevationCalibratedThreshold,
	planPois,
	cpMarkers = [],
	summitMarkers = [],
	onClose,
	onEditStage,
	onDeleteStage,
	onPoiRowClick,
	onEditPoi,
	onDeletePoi,
	readOnly = false,
}: StageDetailPanelProps) {
	const snapped = useMemo(
		() => snapPlanPoisToTrack(planPois, trackPoints),
		[planPois, trackPoints],
	);

	const waypointRows = useMemo(() => {
		if (!stage) return [];
		return stageScheduleWaypoints(
			stage,
			snapped,
			cpMarkers,
			summitMarkers,
			trackPoints,
			elevationCalibratedThreshold,
		);
	}, [stage, snapped, cpMarkers, summitMarkers, trackPoints, elevationCalibratedThreshold]);

	const maxElevationM = useMemo(() => {
		if (!stage) return null;
		return maxElevationInStageRange(trackPoints, stage.startDistanceKm, stage.endDistanceKm);
	}, [trackPoints, stage]);

	if (!stage) return null;

	const color = getStageColor(stage.dayNumber);
	const routeLine =
		stage.startName?.trim() && stage.endName?.trim()
			? `${stage.startName} → ${stage.endName}`
			: null;

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-zinc-900">
			<div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<div
								className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
								style={{ backgroundColor: color.stroke }}
							>
								{stage.dayNumber}
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-baseline gap-1">
									<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
										스테이지 {stage.dayNumber}
									</span>
									{dateLabel ? (
										<span className="text-xs text-zinc-500 dark:text-zinc-400">· {dateLabel}</span>
									) : null}
								</div>
								{routeLine ? (
									<p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
										{routeLine}
									</p>
								) : null}
							</div>
						</div>
						<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
							<span>
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									{formatNumber(stage.distanceKm)} km
								</span>
							</span>
							<span className="text-green-600 dark:text-green-400">
								▲{formatNumber(stage.elevationGain)}m
							</span>
							{maxElevationM != null ? <span>최고 {formatNumber(maxElevationM)}m</span> : null}
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-0.5">
						{readOnly ? null : (
							<DotsMenu
								entries={[
									{
										type: "item",
										key: "edit",
										label: "수정",
										icon: <PencilIcon className="h-4 w-4" />,
										onSelect: onEditStage,
									},
									{ type: "separator", key: "sep" },
									{
										type: "item",
										key: "delete",
										label: "삭제",
										icon: <TrashIcon className="h-4 w-4" />,
										variant: "destructive",
										onSelect: () => onDeleteStage(stage.id),
									},
								]}
							/>
						)}
						<button
							type="button"
							onClick={onClose}
							className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
							aria-label="패널 닫기"
						>
							<XIcon className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<section className="mb-6">
					<h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
						메모
					</h4>
					<p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
						{(stage.memo ?? "").trim() ? (
							stage.memo
						) : (
							<span className="text-zinc-400 dark:text-zinc-500">메모 없음</span>
						)}
					</p>
				</section>

				<section>
					<h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
						경유 포인트 {waypointRows.length}곳
					</h4>
					{waypointRows.length === 0 ? (
						<p className="text-sm text-zinc-400 dark:text-zinc-500">
							등록된 경유 포인트가 없습니다.
						</p>
					) : (
						<StageScheduleWaypointList
							density="comfortable"
							showHeading={false}
							rows={waypointRows}
							onPlanPoiRowClick={onPoiRowClick}
							renderRowEnd={
								readOnly
									? undefined
									: (row) => {
											if (row.markerKind !== "plan_poi" || !row.planPoiId) return null;
											const snap = snapped.find((s) => s.id === row.planPoiId);
											if (!snap) return null;
											return (
												<DotsMenu
													entries={[
														{
															type: "item",
															key: "edit",
															label: "편집",
															icon: <PencilIcon className="h-4 w-4" />,
															onSelect: () => onEditPoi(snap),
														},
														{ type: "separator", key: "sep" },
														{
															type: "item",
															key: "delete",
															label: "삭제",
															icon: <TrashIcon className="h-4 w-4" />,
															variant: "destructive",
															onSelect: () => {
																if (window.confirm("이 경유지를 삭제할까요?")) {
																	onDeletePoi(snap.id);
																}
															},
														},
													]}
												/>
											);
										}
							}
						/>
					)}
				</section>
			</div>
		</div>
	);
}
