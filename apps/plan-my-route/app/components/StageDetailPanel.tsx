"use client";

import { type SnappedPlanPoi, snapPlanPoisToTrack } from "@my-ridings/plan-geometry";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ExternalLinkIcon,
	PencilIcon,
	PhoneIcon,
	TrashIcon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { groupAccommodationCandidates } from "@/lib/accommodation-candidate-groups";
import type { Stage } from "../types/plan";
import { getStageColor } from "../types/plan";
import { type PlanPoiRow, safePlanPoiExternalUrl } from "../types/planPoi";
import type { ScheduleMarkerMemos } from "../types/scheduleMarkerMemos";
import type { StageScheduleWaypoint } from "../types/stageScheduleWaypoint";
import { DotsMenu, type DotsMenuEntry } from "./DotsMenu";
import type { CPOnRoute, SummitOnRoute, TrackPoint } from "./ElevationProfile";
import { maxElevationInStageRange, stageScheduleWaypoints } from "./MobileSharedPlanStagesTab";
import { ScheduleMarkerMemoDialog } from "./ScheduleMarkerMemoDialog";
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
	scheduleMarkerMemos?: ScheduleMarkerMemos | null;
	onScheduleMarkerMemoSave?: (rowKey: string, memoTrimmed: string) => Promise<void>;
	onClose: () => void;
	onEditStage: () => void;
	onDeleteStage: (stageId: string) => void;
	onPoiRowClick: (poiId: string) => void;
	onEditPoi: (poi: SnappedPlanPoi) => void;
	onDeletePoi: (poiId: string) => void;
	onAccommodationOrderChange?: (orderedPoiIds: string[]) => Promise<boolean>;
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
	scheduleMarkerMemos = null,
	onScheduleMarkerMemoSave,
	onClose,
	onEditStage,
	onDeleteStage,
	onPoiRowClick,
	onEditPoi,
	onDeletePoi,
	onAccommodationOrderChange,
	readOnly = false,
}: StageDetailPanelProps) {
	const [scheduleMemoEditRow, setScheduleMemoEditRow] = useState<StageScheduleWaypoint | null>(
		null,
	);
	const [isReorderingAccommodation, setIsReorderingAccommodation] = useState(false);

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
			scheduleMarkerMemos,
		);
	}, [
		stage,
		snapped,
		cpMarkers,
		summitMarkers,
		trackPoints,
		elevationCalibratedThreshold,
		scheduleMarkerMemos,
	]);

	const maxElevationM = useMemo(() => {
		if (!stage) return null;
		return maxElevationInStageRange(trackPoints, stage.startDistanceKm, stage.endDistanceKm);
	}, [trackPoints, stage]);

	const planPoiById = new Map(planPois.map((poi) => [poi.id, poi]));
	const accommodationRows = waypointRows.filter(
		(row) => row.markerKind === "plan_poi" && row.planPoiType === "accommodation",
	);
	const candidateRows = waypointRows.filter(
		(row) =>
			row.markerKind === "plan_poi" &&
			row.planPoiType !== "accommodation" &&
			row.planPoiIntent === "candidate",
	);
	const itineraryRows = waypointRows.filter(
		(row) =>
			!(
				row.markerKind === "plan_poi" &&
				(row.planPoiType === "accommodation" || row.planPoiIntent === "candidate")
			),
	);
	const accommodationGroups = groupAccommodationCandidates(
		accommodationRows.flatMap((row) => {
			if (!row.planPoiId) return [];
			return [
				{
					id: row.planPoiId,
					distanceKm: row.distanceAlongRouteKm,
					sortOrder: planPoiById.get(row.planPoiId)?.candidate_sort_order ?? null,
					row,
				},
			];
		}),
	);

	const moveAccommodation = async (
		orderedPoiIds: string[],
		poiId: string,
		direction: -1 | 1,
	) => {
		if (!onAccommodationOrderChange || isReorderingAccommodation) return;
		const currentIndex = orderedPoiIds.indexOf(poiId);
		const targetIndex = currentIndex + direction;
		if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedPoiIds.length) return;
		const nextIds = [...orderedPoiIds];
		[nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];
		setIsReorderingAccommodation(true);
		try {
			await onAccommodationOrderChange(nextIds);
		} finally {
			setIsReorderingAccommodation(false);
		}
	};

	const renderRowEnd = (row: StageScheduleWaypoint, accommodationPoiIds?: string[]) => {
		if (row.markerKind === "plan_poi" && row.planPoiId) {
			const planPoiId = row.planPoiId;
			const snap = snapped.find((s) => s.id === planPoiId);
			if (!snap) return null;
			const safePlaceUrl =
				safePlanPoiExternalUrl(row.naverPlaceUrl) ?? safePlanPoiExternalUrl(row.placeUrl);
			const entries: DotsMenuEntry[] = [
				{
					type: "item",
					key: "edit",
					label: "편집",
					icon: <PencilIcon className="h-4 w-4" />,
					onSelect: () => onEditPoi(snap),
				},
			];
			const accommodationIndex = accommodationPoiIds?.indexOf(planPoiId) ?? -1;
			if (!readOnly && accommodationPoiIds && accommodationIndex > 0) {
				entries.push({
					type: "item",
					key: "priority-up",
					label: "우선순위 올리기",
					icon: <ArrowUpIcon className="h-4 w-4" />,
					onSelect: () => void moveAccommodation(accommodationPoiIds, planPoiId, -1),
				});
			}
			if (
				!readOnly &&
				accommodationPoiIds &&
				accommodationIndex >= 0 &&
				accommodationIndex < accommodationPoiIds.length - 1
			) {
				entries.push({
					type: "item",
					key: "priority-down",
					label: "우선순위 내리기",
					icon: <ArrowDownIcon className="h-4 w-4" />,
					onSelect: () => void moveAccommodation(accommodationPoiIds, planPoiId, 1),
				});
			}
			entries.push(
				{ type: "separator", key: "sep" },
				{
					type: "item",
					key: "delete",
					label: "삭제",
					icon: <TrashIcon className="h-4 w-4" />,
					variant: "destructive",
					onSelect: () => {
						if (window.confirm("이 경유지를 삭제할까요?")) onDeletePoi(snap.id);
					},
				},
			);
			return (
				<div className="flex items-center gap-1">
					{row.phone ? (
						<a
							href={`tel:${row.phone}`}
							className="rounded p-1 text-blue-600 hover:bg-blue-50"
							aria-label={`${row.name} 전화`}
							title={row.phone}
						>
							<PhoneIcon className="h-4 w-4" />
						</a>
					) : null}
					{safePlaceUrl ? (
						<a
							href={safePlaceUrl}
							target="_blank"
							rel="noreferrer"
							className="rounded p-1 text-blue-600 hover:bg-blue-50"
							aria-label={`${row.name} 네이버 지도에서 보기`}
						>
							<ExternalLinkIcon className="h-4 w-4" />
						</a>
					) : null}
					{readOnly ? null : <DotsMenu entries={entries} />}
				</div>
			);
		}
		if (
			!readOnly &&
			(row.markerKind === "cp" || row.markerKind === "summit") &&
			onScheduleMarkerMemoSave
		) {
			return (
				<DotsMenu
					entries={[
						{
							type: "item",
							key: "memo",
							label: "메모 편집",
							icon: <PencilIcon className="h-4 w-4" />,
							onSelect: () => setScheduleMemoEditRow(row),
						},
					]}
				/>
			);
		}
		return null;
	};

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
						경유 포인트 {itineraryRows.length}곳
					</h4>
					{itineraryRows.length === 0 ? (
						<p className="text-sm text-zinc-400 dark:text-zinc-500">
							등록된 경유 포인트가 없습니다.
						</p>
					) : (
						<StageScheduleWaypointList
							density="comfortable"
							showHeading={false}
							rows={itineraryRows}
							onPlanPoiRowClick={onPoiRowClick}
							renderRowEnd={renderRowEnd}
						/>
					)}
				</section>
				{accommodationGroups.length > 0 ? (
					<section
						className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-700"
						aria-busy={isReorderingAccommodation}
					>
						<div className="mb-4 flex items-baseline justify-between gap-2">
							<h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
								숙박 선택지 {accommodationRows.length}곳
							</h4>
							<span className="text-[11px] text-zinc-400">거리순 · 지역별 우선순위</span>
						</div>
						<div className="space-y-6">
							{accommodationGroups.map((group, groupIndex) => {
								const orderedPoiIds = group.items.map((item) => item.id);
								const stageDistances = group.items.map(
									(item) => item.row.distanceFromStageStartKm,
								);
								const startKm = Math.min(...stageDistances);
								const endKm = Math.max(...stageDistances);
								const distanceLabel =
									Math.abs(endKm - startKm) < 0.05
										? `${startKm.toFixed(1)}km`
										: `${startKm.toFixed(1)}–${endKm.toFixed(1)}km`;
								return (
									<div
										key={group.items[0]?.id}
										className="border-l-2 border-orange-200 pl-3 dark:border-orange-900"
									>
										<div className="mb-3 flex items-center justify-between gap-2">
											<div className="flex items-baseline gap-2">
												<span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
													선택지 {groupIndex + 1}
												</span>
												<span className="tabular-nums text-xs text-zinc-500">{distanceLabel}</span>
											</div>
											{group.additionalDistanceKm != null ? (
												<span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
													+{group.additionalDistanceKm.toFixed(1)}km 더 달리기
												</span>
											) : null}
										</div>
										<StageScheduleWaypointList
											density="comfortable"
											showHeading={false}
											rows={group.items.map((item) => item.row)}
											onPlanPoiRowClick={onPoiRowClick}
											renderRowPrefix={(row) => (
												<span className="mt-0.5 w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-orange-600 dark:text-orange-400">
													{group.items.findIndex((item) => item.row.rowKey === row.rowKey) + 1}
												</span>
											)}
											renderRowEnd={(row) => renderRowEnd(row, orderedPoiIds)}
										/>
									</div>
								);
							})}
						</div>
					</section>
				) : null}
				{candidateRows.length > 0 ? (
					<section className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-700">
						<h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
							다른 후보 장소 {candidateRows.length}곳
						</h4>
						<StageScheduleWaypointList
							density="comfortable"
							showHeading={false}
							rows={candidateRows}
							onPlanPoiRowClick={onPoiRowClick}
							renderRowEnd={renderRowEnd}
						/>
					</section>
				) : null}
			</div>

			<ScheduleMarkerMemoDialog
				open={scheduleMemoEditRow != null}
				onOpenChange={(open) => {
					if (!open) setScheduleMemoEditRow(null);
				}}
				rowKey={scheduleMemoEditRow?.rowKey ?? null}
				markerKind={scheduleMemoEditRow?.markerKind ?? null}
				name={scheduleMemoEditRow?.name ?? ""}
				categoryLabel={scheduleMemoEditRow?.categoryLabel ?? ""}
				initialMemo={scheduleMemoEditRow?.memo ?? ""}
				onSave={async ({ rowKey, memo }) => {
					if (!onScheduleMarkerMemoSave) return;
					await onScheduleMarkerMemoSave(rowKey, memo);
				}}
			/>
		</div>
	);
}
