"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { MAP_VISUAL_PALETTE } from "@/app/constants/mapVisualPalette";
import type { Stage } from "../types/plan";
import { getStageColor, UNPLANNED_COLOR } from "../types/plan";
import {
	type PendingStageEdit,
	computeElevationGainCurve,
} from "../hooks/usePlanStages";

// ── 타입 ─────────────────────────────────────────────────────────
export interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도 (m)
	d?: number; // 누적 거리 (m)
}

export type CPOnRoute = {
	id: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type SummitOnRoute = {
	id: string;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

interface ChartDatum {
	distanceKm: number;
	ele: number;
	index: number;
	/** 이 포인트가 속한 Stage 번호 (없으면 미계획) */
	stageIndex: number | null;
	/** 현재 스테이지 출발점 기준 거리(km). stageIndex 있을 때만 */
	distanceFromStageStartKm?: number;
	/** 현재 스테이지 출발점 기준 누적 상승고도(m). stageIndex 있을 때만 */
	elevationGainFromStageStart?: number;
}

type PreviewStageStats = { distanceKm: number; elevationGain: number; elevationLoss: number };

interface ElevationProfileProps {
	trackPoints: TrackPoint[];
	positionIndex?: number | null;
	onPositionChange?: (index: number | null) => void;
	stages?: Stage[];
	activeStageId?: string | null;
	/** 선택된 일차 (1-based). null이면 전체 표시 */
	selectedDayNumber?: number | null;
	/** day: 선택할 일차. null: 선택 해제(전체 구간) */
	onSelectedDayChange?: (day: number | null) => void;
	/** 경계 미리보기 (드래그 중) */
	pendingStageEdit?: PendingStageEdit | null;
	/** 미리보기 구간 고도/거리 (usePlanStages.previewStageStats) */
	previewStageStats?: PreviewStageStats | null;
	/** 경계 드래그 시작 */
	onStartBoundaryDrag?: (stageId: string, originalEndKm: number) => void;
	/** 경계 드래그 이동 */
	onPreviewMove?: (stageId: string, previewEndKm: number) => void;
	/** 미리보기 적용 */
	onCommitPreview?: () => void;
	/** 미리보기 취소 */
	onDiscardPreview?: () => void;
	isPinned?: boolean;
	onPin?: (index: number) => void;
	onUnpin?: () => void;
	/** 스테이지 상승고도와 동일한 smoothing 적용 시 사용 (usePlanStages.calibratedThreshold) */
	elevationCalibratedThreshold?: number;
	/** 경로상 CP(Control Point) 리스트 — 거리순 정렬 */
	cpMarkers?: CPOnRoute[];
	/** 경로상 Summit 리스트 — 거리순 정렬 */
	summitMarkers?: SummitOnRoute[];
}

// ── 헬퍼 ─────────────────────────────────────────────────────────

type GainCurve = { distanceM: number; gain: number }[];

function lookupGainAtDistanceKm(curve: GainCurve, distanceKm: number): number {
	if (curve.length === 0) return 0;
	const distanceM = distanceKm * 1000;
	let j = curve.length - 1;
	while (j >= 0 && curve[j].distanceM > distanceM) j--;
	return j >= 0 ? curve[j].gain : 0;
}

function buildChartData(
	points: TrackPoint[],
	stages: Stage[],
	elevationCalibratedThreshold?: number,
	maxSamples = 2000,
): ChartDatum[] {
	const withEle = points.filter((p) => p.e != null && p.d != null);
	if (withEle.length === 0) return [];

	const useSmoothedGain =
		typeof elevationCalibratedThreshold === "number" &&
		elevationCalibratedThreshold >= 0 &&
		stages.length > 0;

	// 스테이지별 스무딩 적용 상승고도 곡선 (elevationCalibratedThreshold 있을 때만 사용)
	const stageGainCurves: GainCurve[] = useSmoothedGain
		? stages.map((stage) =>
				computeElevationGainCurve(
					points,
					stage.startDistanceKm,
					stage.endDistanceKm,
					elevationCalibratedThreshold!,
				),
			)
		: [];

	// 스무딩 미사용 시: 전체 구간 누적 상승고도 (withEle 인덱스 기준)
	const cumulativeGain: number[] = [];
	if (!useSmoothedGain) {
		for (let i = 0; i < withEle.length; i++) {
			if (i === 0) {
				cumulativeGain.push(0);
			} else {
				const prev = withEle[i - 1].e!;
				const curr = withEle[i].e!;
				cumulativeGain.push(cumulativeGain[i - 1] + Math.max(0, curr - prev));
			}
		}
	}

	const stageStartIndices: number[] = stages.map((stage) => {
		const idx = withEle.findIndex((p) => p.d! / 1000 >= stage.startDistanceKm);
		return idx === -1 ? withEle.length : idx;
	});

	const findFirstIndexAtOrAfter = (distanceKm: number) => {
		const idx = withEle.findIndex((p) => p.d! / 1000 >= distanceKm);
		return idx === -1 ? withEle.length - 1 : idx;
	};

	const step = Math.max(1, Math.ceil(withEle.length / maxSamples));
	const sampledIndexSet = new Set<number>();
	for (let i = 0; i < withEle.length; i += step) sampledIndexSet.add(i);
	sampledIndexSet.add(withEle.length - 1);

	for (const stage of stages) {
		const startIdx = findFirstIndexAtOrAfter(stage.startDistanceKm);
		const endIdx = findFirstIndexAtOrAfter(stage.endDistanceKm);
		sampledIndexSet.add(startIdx);
		sampledIndexSet.add(endIdx);
		if (startIdx > 0) sampledIndexSet.add(startIdx - 1);
		if (endIdx > 0) sampledIndexSet.add(endIdx - 1);
	}

	const sampledIndices = [...sampledIndexSet]
		.filter((idx) => idx >= 0 && idx < withEle.length)
		.sort((a, b) => a - b);

	return sampledIndices.map((withEleIndex) => {
		const rawDistanceKm = withEle[withEleIndex].d! / 1000;
		const distanceKm = Math.round(rawDistanceKm * 100) / 100;
		let stageIndex: number | null = null;
		for (let i = 0; i < stages.length; i++) {
			if (
				rawDistanceKm >= stages[i].startDistanceKm &&
				rawDistanceKm <= stages[i].endDistanceKm
			) {
				stageIndex = i;
				break;
			}
		}

		const datum: ChartDatum = {
			distanceKm,
			ele: Math.round(withEle[withEleIndex].e!),
			index: points.indexOf(withEle[withEleIndex]),
			stageIndex,
		};

		if (stageIndex !== null) {
			const stage = stages[stageIndex];
			datum.distanceFromStageStartKm =
				Math.round((rawDistanceKm - stage.startDistanceKm) * 100) / 100;
			if (useSmoothedGain && stageGainCurves[stageIndex]) {
				datum.elevationGainFromStageStart = lookupGainAtDistanceKm(
					stageGainCurves[stageIndex],
					rawDistanceKm,
				);
			} else {
				const startIdx = stageStartIndices[stageIndex];
				datum.elevationGainFromStageStart = Math.round(
					startIdx < withEleIndex
						? cumulativeGain[withEleIndex] - cumulativeGain[startIdx]
						: 0,
				);
			}
		}

		return datum;
	});
}

/** 선택 일차 기준 표시 구간: 선택 일차 전체 + 이전/다음 일차 15% */
function computeVisibleRange(
	stages: Stage[],
	selectedDayNumber: number,
	totalKm: number,
): { startKm: number; endKm: number } {
	const stageIdx = stages.findIndex((s) => s.dayNumber === selectedDayNumber);
	if (stageIdx === -1) return { startKm: 0, endKm: totalKm };
	const stage = stages[stageIdx];
	const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
	const nextStage =
		stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null;

	const prevPadding = prevStage ? prevStage.distanceKm * 0.15 : 0;
	const nextPadding = nextStage ? nextStage.distanceKm * 0.15 : 0;

	const startKm = prevStage
		? Math.max(0, prevStage.endDistanceKm - prevPadding)
		: stage.startDistanceKm;
	const endKm = nextStage
		? Math.min(totalKm, nextStage.startDistanceKm + nextPadding)
		: stage.endDistanceKm;

	return { startKm, endKm };
}

/** Stage별로 분리된 데이터 키 생성. 각 Stage는 자기 구간만 값을 갖고 나머지는 undefined */
function buildStageKeys(
	chartData: ChartDatum[],
	stages: Stage[],
): { data: Record<string, number | undefined>[]; keys: string[] } {
	const keys: string[] = [];

	// Stage별 키
	for (let i = 0; i < stages.length; i++) {
		keys.push(`stage_${i}`);
	}
	// 미계획 구간 키
	keys.push("unplanned");

	const data = chartData.map((d) => {
		const row: Record<string, number | undefined> = {
			distanceKm: d.distanceKm,
			ele: d.ele,
			index: d.index,
			distanceFromStageStartKm: d.distanceFromStageStartKm,
			elevationGainFromStageStart: d.elevationGainFromStageStart,
		};

		for (let i = 0; i < stages.length; i++) {
			row[`stage_${i}`] = d.stageIndex === i ? d.ele : undefined;
		}
		row.unplanned = d.stageIndex === null ? d.ele : undefined;

		return row;
	});

	return { data, keys };
}

// ── 경계 드래그 핸들 ──────────────────────────────────────────────
function BoundaryHandle({
	boundaryKm,
	visibleStart,
	visibleEnd,
	onMouseDown,
}: {
	boundaryKm: number;
	visibleStart: number;
	visibleEnd: number;
	isDragging: boolean;
	onMouseDown: (e: React.MouseEvent) => void;
}) {
	const span = visibleEnd - visibleStart;
	const leftPct =
		span > 0 ? ((boundaryKm - visibleStart) / span) * 100 : 0;
	return (
		<button
			type="button"
			aria-label="경계 이동"
			onMouseDown={onMouseDown}
			className="absolute top-0 left-0 z-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-zinc-400 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-500 dark:bg-zinc-800"
			style={{
				width: 14,
				height: 14,
				left: `${Math.max(0, Math.min(100, leftPct))}%`,
			}}
			tabIndex={-1}
		/>
	);
}

// ── 드래그 중 툴팁 (원본 vs 새값 vs 증감) ──────────────────────────
function BoundaryTooltip({
	stage,
	originalEndKm,
	previewEndKm,
	previewStats,
	leftPct,
}: {
	stage: Stage;
	originalEndKm: number;
	previewEndKm: number;
	previewStats: PreviewStageStats | null;
	leftPct: number;
}) {
	const distDelta = previewStats
		? previewStats.distanceKm - stage.distanceKm
		: 0;
	const gainDelta = previewStats ? previewStats.elevationGain - stage.elevationGain : 0;
	const lossDelta = previewStats ? previewStats.elevationLoss - stage.elevationLoss : 0;

	const formatDelta = (v: number) =>
		v >= 0 ? `+${v}` : `${v}`;
	const formatDeltaKm = (v: number) =>
		v >= 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`;

	return (
		<div
			className="pointer-events-none absolute z-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
			role="tooltip"
			style={{
				left: `${Math.max(8, Math.min(92, leftPct))}%`,
				top: 4,
				transform: leftPct > 25 ? "translateX(calc(-100% - 32px))" : "translateX(32px)",
			}}
		>
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">
				{stage.dayNumber}일 경계
			</p>
			<div className="mt-1.5 space-y-0.5">
				<p className="text-zinc-500 dark:text-zinc-400">
					원본: {stage.distanceKm.toFixed(1)} km · +{stage.elevationGain}m / -{stage.elevationLoss}m
				</p>
				{previewStats && (
					<>
						<p className="text-zinc-800 dark:text-zinc-200">
							새값: {previewStats.distanceKm.toFixed(1)} km · +{previewStats.elevationGain}m / -{previewStats.elevationLoss}m
						</p>
						<p className="text-orange-600 dark:text-orange-400 font-medium">
							증감: {formatDeltaKm(distDelta)} km · {formatDelta(gainDelta)}m / {formatDelta(lossDelta)}m
						</p>
					</>
				)}
			</div>
		</div>
	);
}

/** 스테이지(또는 전체) 기준: minDistanceKm 이전에 있는 CP는 직전 CP 후보에서 제외 */
function findPrevCPInContext(
	cpMarkers: CPOnRoute[],
	distanceKm: number,
	minDistanceKm: number,
): CPOnRoute | null {
	let prev: CPOnRoute | null = null;
	for (const cp of cpMarkers) {
		if (cp.distanceKm < minDistanceKm) continue;
		if (cp.distanceKm <= distanceKm) prev = cp;
		else break;
	}
	return prev;
}

function findNextCPInContext(
	cpMarkers: CPOnRoute[],
	distanceKm: number,
	maxDistanceKm: number,
): CPOnRoute | null {
	for (const cp of cpMarkers) {
		if (cp.distanceKm > distanceKm && cp.distanceKm <= maxDistanceKm) return cp;
	}
	return null;
}

function computeRawGainBetweenKm(
	points: TrackPoint[],
	fromKm: number,
	toKm: number,
): number {
	const withEle = points.filter((p) => p.e != null && p.d != null);
	if (withEle.length < 2 || toKm <= fromKm) return 0;
	const findIdx = (km: number) => {
		const idx = withEle.findIndex((p) => p.d! / 1000 >= km);
		return idx === -1 ? withEle.length - 1 : idx;
	};
	const i0 = findIdx(fromKm);
	const i1 = findIdx(toKm);
	if (i1 <= i0) return 0;
	let gain = 0;
	for (let i = i0 + 1; i <= i1; i++) {
		const prevE = withEle[i - 1].e!;
		const currE = withEle[i].e!;
		gain += Math.max(0, currE - prevE);
	}
	return Math.round(gain);
}

function computeSegmentGainBetweenKm(
	points: TrackPoint[],
	fromKm: number,
	toKm: number,
	elevationCalibratedThreshold?: number,
): number {
	if (toKm <= fromKm) return 0;
	const useSmooth =
		typeof elevationCalibratedThreshold === "number" &&
		elevationCalibratedThreshold >= 0;
	if (useSmooth) {
		const curve = computeElevationGainCurve(
			points,
			fromKm,
			toKm,
			elevationCalibratedThreshold!,
		);
		return Math.round(lookupGainAtDistanceKm(curve, toKm));
	}
	return computeRawGainBetweenKm(points, fromKm, toKm);
}

// ── CP 마커 라벨 (Recharts ReferenceLine label) ──────────────────
const CP_COLOR = MAP_VISUAL_PALETTE.elevationCpStroke;
const SUMMIT_COLOR = CP_COLOR;
const CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE = 3;

function CPMarkerLabel({
	viewBox,
	showName,
	name,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	return (
		<g>
			<polygon
				points={`${x - triW},${y} ${x + triW},${y} ${x},${y + triH}`}
				fill={CP_COLOR}
			/>
			{showName && (
				<text
					x={x}
					y={y - 4}
					textAnchor="middle"
					fill="#71717a"
					fontSize={11}
					fontWeight={500}
				>
					{name}
				</text>
			)}
		</g>
	);
}

function SummitMarkerLabel({
	viewBox,
	showName,
	name,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	return (
		<g>
			<polygon
				points={`${x - triW},${y + triH} ${x + triW},${y + triH} ${x},${y}`}
				fill={SUMMIT_COLOR}
			/>
			{showName && (
				<text
					x={x}
					y={y - 4}
					textAnchor="middle"
					fill="#71717a"
					fontSize={11}
					fontWeight={500}
				>
					{name}
				</text>
			)}
		</g>
	);
}

// ── 커스텀 툴팁 ───────────────────────────────────────────────────
function CustomTooltip({
	active,
	payload,
	trackPoints,
	cpMarkers,
	elevationCalibratedThreshold,
	cpAnchorMinKm,
	cpAnchorMaxKm,
	anchorFallbackDayNumber,
}: {
	active?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload?: Array<{ payload: any }>;
	trackPoints: TrackPoint[];
	cpMarkers: CPOnRoute[];
	elevationCalibratedThreshold?: number;
	/** 일차 선택 시 해당 스테이지 시작 거리(km). 이보다 앞의 CP는 직전 CP로 쓰지 않음 */
	cpAnchorMinKm: number;
	/** 스테이지 종료 km — 이보다 뒤의 CP는 다음 CP로 쓰지 않음 */
	cpAnchorMaxKm: number;
	anchorFallbackDayNumber: number | null;
}) {
	if (!active || !payload?.length) return null;
	const d = payload[0].payload;
	const hasStageStats =
		typeof d.distanceFromStageStartKm === "number" &&
		typeof d.elevationGainFromStageStart === "number";
	const km = Number(d.distanceKm);
	const prevCp = findPrevCPInContext(cpMarkers, km, cpAnchorMinKm);
	const segFromKm = prevCp?.distanceKm ?? cpAnchorMinKm;
	const segDist = Math.round((km - segFromKm) * 10) / 10;
	const segGain =
		cpMarkers.length > 0 && trackPoints.length > 0
			? computeSegmentGainBetweenKm(
					trackPoints,
					segFromKm,
					km,
					elevationCalibratedThreshold,
				)
			: 0;
	const cpSegLabel = prevCp
		? "이전 CP부터"
		: anchorFallbackDayNumber != null
			? `${anchorFallbackDayNumber}일 출발부터`
			: "출발부터";

	const nextCp = findNextCPInContext(cpMarkers, km, cpAnchorMaxKm);
	const nextTargetKm = nextCp?.distanceKm ?? (hasStageStats ? cpAnchorMaxKm : null);
	const nextTargetLabel = nextCp
		? "다음 CP까지"
		: hasStageStats && anchorFallbackDayNumber != null
			? `${anchorFallbackDayNumber}일 종료까지`
			: null;
	const remainKm =
		nextTargetKm != null ? Math.round((nextTargetKm - km) * 10) / 10 : null;
	const remainGain =
		nextTargetKm != null && trackPoints.length > 0
			? computeSegmentGainBetweenKm(
					trackPoints,
					km,
					nextTargetKm,
					elevationCalibratedThreshold,
				)
			: null;

	return (
		<div className="min-w-[200px] rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs dark:border-zinc-700 dark:bg-zinc-800">
			<div className="flex justify-between gap-4 font-semibold text-zinc-800 dark:text-zinc-100">
				<span>전체</span>
				<span>{km.toFixed(1)} km · △ {d.ele} m</span>
			</div>
			{hasStageStats && (
				<div className="mt-1 flex justify-between gap-4 text-zinc-500 dark:text-zinc-400">
					<span>스테이지</span>
					<span>+{Number(d.distanceFromStageStartKm).toFixed(1)} km · ▲ {d.elevationGainFromStageStart} m</span>
				</div>
			)}
			{cpMarkers.length > 0 && (
				<div className="mt-1 space-y-0.5 border-t border-zinc-200 pt-1 dark:border-zinc-600">
					<div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
						<span>{cpSegLabel}</span>
						<span>+{segDist.toFixed(1)} km · ▲ {segGain} m</span>
					</div>
					{nextTargetLabel != null && remainKm != null && remainGain != null && (
						<div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
							<span>{nextTargetLabel}</span>
							<span>{remainKm.toFixed(1)} km · ▲ {remainGain} m</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function ElevationProfile({
	trackPoints,
	positionIndex = null,
	onPositionChange,
	stages = [],
	activeStageId,
	selectedDayNumber = null,
	onSelectedDayChange,
	pendingStageEdit = null,
	previewStageStats = null,
	onStartBoundaryDrag,
	onPreviewMove,
	onCommitPreview,
	onDiscardPreview,
	isPinned = false,
	onPin,
	onUnpin,
	elevationCalibratedThreshold,
	cpMarkers = [],
	summitMarkers = [],
}: ElevationProfileProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const frozenVisibleRangeRef = useRef<{ startKm: number; endKm: number } | null>(null);

	const rawChartData = useMemo(
		() =>
			buildChartData(
				trackPoints,
				stages,
				elevationCalibratedThreshold,
			),
		[trackPoints, stages, elevationCalibratedThreshold],
	);

	const hasStages = stages.length > 0;
	const totalKm =
		rawChartData.length > 0
			? rawChartData[rawChartData.length - 1].distanceKm
			: 0;

	const computedVisibleRange = useMemo(() => {
		if (!hasStages || selectedDayNumber == null)
			return { startKm: 0, endKm: totalKm };
		return computeVisibleRange(stages, selectedDayNumber, totalKm);
	}, [hasStages, selectedDayNumber, stages, totalKm]);

	const { startKm: visibleStart, endKm: visibleEnd } = useMemo(() => {
		if (!pendingStageEdit) {
			frozenVisibleRangeRef.current = null;
			return computedVisibleRange;
		}
		if (!frozenVisibleRangeRef.current) {
			frozenVisibleRangeRef.current = {
				startKm: computedVisibleRange.startKm,
				endKm: computedVisibleRange.endKm,
			};
		}
		return frozenVisibleRangeRef.current;
	}, [pendingStageEdit, computedVisibleRange]);

	const clippedChartData = useMemo(() => {
		if (selectedDayNumber == null) return rawChartData;
		return rawChartData.filter(
			(d) => d.distanceKm >= visibleStart && d.distanceKm <= visibleEnd,
		);
	}, [rawChartData, selectedDayNumber, visibleStart, visibleEnd]);

	const { data: multiStageData, keys: stageKeys } = useMemo(
		() => buildStageKeys(clippedChartData, stages),
		[clippedChartData, stages],
	);

	const chartData = hasStages ? multiStageData : clippedChartData;

	type TooltipState = {
		activeTooltipIndex?: number | string | null;
	};

	const getChartDataIndexAtTooltip = useCallback(
		(state: TooltipState): number | null => {
			const tooltipIndex = state.activeTooltipIndex;
			if (tooltipIndex == null) return null;
			const normalizedTooltipIndex =
				typeof tooltipIndex === "string"
					? Number(tooltipIndex)
					: tooltipIndex;
			if (!Number.isInteger(normalizedTooltipIndex)) return null;
			const row = chartData[normalizedTooltipIndex] as { index?: number } | undefined;
			return typeof row?.index === "number" ? row.index : null;
		},
		[chartData],
	);

	const handleMouseMove = useCallback(
		(state: TooltipState) => {
			const index = getChartDataIndexAtTooltip(state);
			if (index == null) return;
			lastHoverIndexRef.current = index;
			if (!isPinned && onPositionChange) onPositionChange(index);
		},
		[getChartDataIndexAtTooltip, onPositionChange, isPinned],
	);

	const handleMouseLeave = useCallback(() => {
		// 마우스 벗어나도 마커 유지 (null 전달하지 않음)
	}, []);

	const lastHoverIndexRef = useRef<number | null>(null);

	const handleChartClick = useCallback(() => {
		if (isPinned && onUnpin) {
			onUnpin();
			return;
		}
		if (!onPin || lastHoverIndexRef.current == null) return;
		onPin(lastHoverIndexRef.current);
	}, [isPinned, onPin, onUnpin]);

	const selectedStage =
		hasStages && selectedDayNumber != null
			? stages.find((s) => s.dayNumber === selectedDayNumber) ?? null
			: null;
	const selectedStageIdx =
		selectedStage != null
			? stages.findIndex((s) => s.id === selectedStage.id)
			: -1;
	const isLastStage =
		selectedStageIdx >= 0 && selectedStageIdx === stages.length - 1;
	const canDragBoundary =
		selectedStage != null &&
		!isLastStage &&
		onStartBoundaryDrag != null &&
		onPreviewMove != null;

	const handleBoundaryDrag = useCallback(
		(clientX: number) => {
			if (!chartContainerRef.current || !selectedStage || !onPreviewMove)
				return;
			const rect = chartContainerRef.current.getBoundingClientRect();
			const span = visibleEnd - visibleStart;
			if (span <= 0) return;
			const km =
				visibleStart +
				((clientX - rect.left) / rect.width) * span;
			onPreviewMove(selectedStage.id, Math.round(km * 10) / 10);
		},
		[selectedStage, visibleStart, visibleEnd, onPreviewMove],
	);

	useEffect(() => {
		if (!isDragging) return;
		const onMove = (e: MouseEvent) => handleBoundaryDrag(e.clientX);
		const onUp = () => setIsDragging(false);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isDragging, handleBoundaryDrag]);

	useEffect(() => {
		if (!pendingStageEdit) setIsDragging(false);
	}, [pendingStageEdit]);

	const currentChartDatum = useMemo(() => {
		if (positionIndex == null || rawChartData.length === 0) return null;
		return rawChartData.reduce<ChartDatum | null>((best, d) => {
			if (!best) return d;
			return Math.abs(d.index - positionIndex) <
				Math.abs(best.index - positionIndex)
				? d
				: best;
		}, null);
	}, [positionIndex, rawChartData]);

	if (rawChartData.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);
	}

	const pendingStage = pendingStageEdit
		? stages.find((s) => s.id === pendingStageEdit.stageId) ?? null
		: null;
	const boundaryKmForHandle = pendingStageEdit
		? pendingStageEdit.previewEndKm
		: selectedStage?.endDistanceKm ?? 0;

	// Stage 경계선: 표시 구간 내의 것만. pending인 경계는 별도 처리 (점선+실선)
	const stageBoundaries = stages
		.map((s) => ({ distanceKm: s.endDistanceKm, stageId: s.id, label: `Stage ${s.dayNumber}` }))
		.filter(
			(b) =>
				b.distanceKm >= visibleStart &&
				b.distanceKm <= visibleEnd &&
				!(pendingStageEdit && b.stageId === pendingStageEdit.stageId),
		);

	const visibleCPs = cpMarkers.filter(
		(cp) => cp.distanceKm >= visibleStart && cp.distanceKm <= visibleEnd,
	);
	const showCPNames = selectedDayNumber != null;
	const showSummits = selectedDayNumber != null;
	const visibleSummits = showSummits
		? summitMarkers
				.filter(
					(summit) =>
						summit.distanceKm >= visibleStart && summit.distanceKm <= visibleEnd,
				)
				.filter(
					(summit) =>
						!visibleCPs.some(
							(cp) =>
								Math.abs(cp.trackPointIndex - summit.trackPointIndex) <=
								CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE,
						),
				)
		: [];
	const tooltipCpAnchorKm = selectedStage?.startDistanceKm ?? 0;
	const tooltipCpAnchorMaxKm = selectedStage?.endDistanceKm ?? totalKm;
	const tooltipAnchorDayNumber = selectedStage?.dayNumber ?? null;

	return (
		<div className="flex h-full w-full flex-col gap-1 px-2 pt-2">
			{/* 범례 헤더 */}
			<div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<div className="flex items-center gap-3 min-w-0">
					<span className="font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
						고도 프로필
					</span>
					<span className="shrink-0">총 {totalKm.toFixed(0)} km</span>
					{hasStages && (
						<div className="flex items-center gap-1">
							{stages.map((s) => {
								const color = getStageColor(s.dayNumber);
								const isSelected = selectedDayNumber === s.dayNumber;
								const isActive = activeStageId === s.id;
								return (
									<button
										key={s.id}
										type="button"
										onClick={() =>
											onSelectedDayChange?.(isSelected ? null : s.dayNumber)
										}
										className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors shrink-0 ${
											isSelected
												? "bg-zinc-200 dark:bg-zinc-600 font-semibold"
												: "hover:bg-zinc-100 dark:hover:bg-zinc-700"
										} ${isActive ? "ring-1 ring-offset-1 ring-zinc-400" : ""}`}
									>
										<span
											className="inline-block h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: color.stroke }}
										/>
										{s.dayNumber}일
									</button>
								);
							})}
						</div>
					)}
				</div>
				{pendingStageEdit != null && (
					<div className="flex items-center gap-1 shrink-0">
						<button
							type="button"
							onClick={onDiscardPreview}
							className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
						>
							취소
						</button>
						<button
							type="button"
							onClick={onCommitPreview}
							className="rounded px-2 py-1 text-xs font-medium bg-orange-500 text-white hover:bg-orange-600"
						>
							적용
						</button>
					</div>
				)}
			</div>

			{/* 차트 */}
			<div
				ref={chartContainerRef}
				className="relative flex-1 min-h-0"
			>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						data={chartData as any}
						margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
						onMouseDown={handleChartClick}
					>
						<defs>
							{/* 기본 그라디언트 (Stage 없을 때) */}
							<linearGradient
								id="eleGradient"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor="#f97316"
									stopOpacity={0.4}
								/>
								<stop
									offset="95%"
									stopColor="#f97316"
									stopOpacity={0.05}
								/>
							</linearGradient>
							{/* Stage별 그라디언트 */}
							{stages.map((s, i) => {
								const color = getStageColor(s.dayNumber);
								return (
									<linearGradient
										key={s.id}
										id={`stageGradient_${i}`}
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor={color.stroke}
											stopOpacity={
												activeStageId === s.id
													? 0.6
													: 0.35
											}
										/>
										<stop
											offset="95%"
											stopColor={color.stroke}
											stopOpacity={0.05}
										/>
									</linearGradient>
								);
							})}
							{/* 미계획 그라디언트 */}
							<linearGradient
								id="unplannedGradient"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor={UNPLANNED_COLOR.stroke}
									stopOpacity={0.2}
								/>
								<stop
									offset="95%"
									stopColor={UNPLANNED_COLOR.stroke}
									stopOpacity={0.02}
								/>
							</linearGradient>
						</defs>

						<CartesianGrid
							strokeDasharray="3 3"
							stroke="rgba(0,0,0,0.07)"
						/>

						<XAxis
							dataKey="distanceKm"
							type="number"
							domain={
								selectedDayNumber != null
									? [visibleStart, visibleEnd]
									: ["dataMin", "dataMax"]
							}
							tickFormatter={(v: number) => {
								const rounded = Math.round(v * 10) / 10;
								return Number.isInteger(rounded)
									? `${rounded} km`
									: `${rounded.toFixed(1)} km`;
							}}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
						/>

						<YAxis
							dataKey="ele"
							type="number"
							domain={[
								(dataMin: number) => Math.max(0, Math.floor(dataMin / 100) * 100),
								(dataMax: number) => Math.ceil(dataMax / 100) * 100 + 150,
							]}
							tickFormatter={(v: number) => `${v}`}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							width={38}
							label={{
								value: "m",
								angle: -90,
								position: "insideLeft",
								style: { fill: "#9ca3af", fontSize: 10 },
							}}
						/>

						<Tooltip
							cursor={{
								stroke: "#f97316",
								strokeWidth: 1,
								strokeDasharray: "4 2",
							}}
							content={
								<CustomTooltip
									trackPoints={trackPoints}
									cpMarkers={cpMarkers}
									elevationCalibratedThreshold={elevationCalibratedThreshold}
									cpAnchorMinKm={tooltipCpAnchorKm}
									cpAnchorMaxKm={tooltipCpAnchorMaxKm}
									anchorFallbackDayNumber={tooltipAnchorDayNumber}
								/>
							}
						/>

						{/* Stage가 없는 경우: 기본 Area */}
						{!hasStages && (
							<Area
								type="monotone"
								dataKey="ele"
								stroke="#f97316"
								strokeWidth={1.5}
								fill="url(#eleGradient)"
								isAnimationActive={false}
								activeDot={{
									r: 4,
									fill: "#f97316",
									stroke: "#fff",
									strokeWidth: 2,
								}}
							/>
						)}

						{/* Stage가 있는 경우: Stage별 Area */}
						{hasStages &&
							stageKeys.map((key) => {
								if (key === "unplanned") {
									return (
										<Area
											key={key}
											type="monotone"
											dataKey={key}
											stroke={UNPLANNED_COLOR.stroke}
											strokeWidth={1}
											strokeDasharray="4 2"
											fill="url(#unplannedGradient)"
											isAnimationActive={false}
											connectNulls={false}
											dot={false}
											activeDot={false}
										/>
									);
								}
								const idx = parseInt(key.split("_")[1]);
								const stage = stages[idx];
								if (!stage) return null;
								const color = getStageColor(stage.dayNumber);
								const isActive = activeStageId === stage.id;
								return (
									<Area
										key={key}
										type="monotone"
										dataKey={key}
										stroke={color.stroke}
										strokeWidth={isActive ? 2.5 : 1.5}
										fill={`url(#stageGradient_${idx})`}
										isAnimationActive={false}
										connectNulls={false}
										dot={false}
										activeDot={
											isActive
												? {
														r: 4,
														fill: color.stroke,
														stroke: "#fff",
														strokeWidth: 2,
													}
												: false
										}
									/>
								);
							})}

						{/* Stage 경계선 (pending 제외) */}
						{hasStages &&
							stageBoundaries.map((b, i) => (
								<ReferenceLine
									key={`boundary-${b.stageId}`}
									x={b.distanceKm}
									stroke="#a1a1aa"
									strokeWidth={1}
									strokeDasharray="3 3"
								/>
							))}
						{/* Pending: 원본 점선 + 미리보기 실선 */}
						{pendingStageEdit && pendingStage && (
							<>
								<ReferenceLine
									x={pendingStageEdit.originalEndKm}
									stroke="#a1a1aa"
									strokeWidth={1.5}
									strokeDasharray="4 4"
								/>
								<ReferenceLine
									x={pendingStageEdit.previewEndKm}
									stroke="#3b82f6"
									strokeWidth={2}
								/>
							</>
						)}

						{/* CP 마커 */}
						{visibleCPs.map((cp) => (
							<ReferenceLine
								key={`cp-${cp.id}`}
								x={cp.distanceKm}
								stroke={CP_COLOR}
								strokeWidth={0.5}
								strokeDasharray="2 3"
								label={
									<CPMarkerLabel
										showName={showCPNames}
										name={cp.name}
									/>
								}
							/>
						))}
						{/* Summit 마커 (스테이지 선택 시에만, CP 겹침은 제외) */}
						{visibleSummits.map((summit) => (
							<ReferenceLine
								key={`summit-${summit.id}`}
								x={summit.distanceKm}
								stroke={SUMMIT_COLOR}
								strokeWidth={0.5}
								strokeDasharray="2 3"
								label={
									<SummitMarkerLabel
										showName={showSummits}
										name={summit.name}
									/>
								}
							/>
						))}

						{/* 외부 제어 마커 */}
						{currentChartDatum != null && (
							<>
								<ReferenceLine
									x={currentChartDatum.distanceKm}
									stroke="#f97316"
									strokeWidth={1.5}
									strokeDasharray="4 2"
								/>
								<ReferenceDot
									x={currentChartDatum.distanceKm}
									y={currentChartDatum.ele}
									r={5}
									fill="#f97316"
									stroke="#fff"
									strokeWidth={2}
								/>
							</>
						)}
					</AreaChart>
				</ResponsiveContainer>
				{/* 핀 고정 툴팁 */}
				{isPinned && currentChartDatum != null && (() => {
					const span = visibleEnd - visibleStart;
					const leftPct = span > 0
						? ((currentChartDatum.distanceKm - visibleStart) / span) * 100
						: 50;
					const km = currentChartDatum.distanceKm;
					const ele = currentChartDatum.ele;
					const hasStageStats =
						typeof currentChartDatum.distanceFromStageStartKm === "number" &&
						typeof currentChartDatum.elevationGainFromStageStart === "number";
					const prevCp = findPrevCPInContext(cpMarkers, km, tooltipCpAnchorKm);
					const segFromKm = prevCp?.distanceKm ?? tooltipCpAnchorKm;
					const segDist = Math.round((km - segFromKm) * 10) / 10;
					const segGain =
						cpMarkers.length > 0 && trackPoints.length > 0
							? computeSegmentGainBetweenKm(trackPoints, segFromKm, km, elevationCalibratedThreshold)
							: 0;
					const cpSegLabel = prevCp
						? "이전 CP부터"
						: tooltipAnchorDayNumber != null
							? `${tooltipAnchorDayNumber}일 출발부터`
							: "출발부터";
					const nextCp = findNextCPInContext(cpMarkers, km, tooltipCpAnchorMaxKm);
					const nextTargetKm = nextCp?.distanceKm ?? (hasStageStats ? tooltipCpAnchorMaxKm : null);
					const nextTargetLabel = nextCp
						? "다음 CP까지"
						: hasStageStats && tooltipAnchorDayNumber != null
							? `${tooltipAnchorDayNumber}일 종료까지`
							: null;
					const remainKm = nextTargetKm != null ? Math.round((nextTargetKm - km) * 10) / 10 : null;
					const remainGain = nextTargetKm != null && trackPoints.length > 0
						? computeSegmentGainBetweenKm(trackPoints, km, nextTargetKm, elevationCalibratedThreshold)
						: null;
					return (
						<div
							className="pointer-events-auto absolute z-20 min-w-[200px] cursor-pointer rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs shadow-lg dark:border-orange-600 dark:bg-zinc-800"
							style={{
								left: `${Math.max(4, Math.min(96, leftPct))}%`,
								top: 4,
								transform: leftPct > 60 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
							}}
							onClick={(e) => { e.stopPropagation(); onUnpin?.(); }}
						>
							<div className="flex justify-between gap-4 font-semibold text-zinc-800 dark:text-zinc-100">
								<span>📌 전체</span>
								<span>{km.toFixed(1)} km · △ {ele} m</span>
							</div>
							{hasStageStats && (
								<div className="mt-1 flex justify-between gap-4 text-zinc-500 dark:text-zinc-400">
									<span>스테이지</span>
									<span>+{Number(currentChartDatum.distanceFromStageStartKm).toFixed(1)} km · ▲ {currentChartDatum.elevationGainFromStageStart} m</span>
								</div>
							)}
							{cpMarkers.length > 0 && (
								<div className="mt-1 space-y-0.5 border-t border-zinc-200 pt-1 dark:border-zinc-600">
									<div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
										<span>{cpSegLabel}</span>
										<span>+{segDist.toFixed(1)} km · ▲ {segGain} m</span>
									</div>
									{nextTargetLabel != null && remainKm != null && remainGain != null && (
										<div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
											<span>{nextTargetLabel}</span>
											<span>{remainKm.toFixed(1)} km · ▲ {remainGain} m</span>
										</div>
									)}
								</div>
							)}
							<p className="mt-1 text-zinc-400 dark:text-zinc-500 text-center">클릭하여 해제</p>
						</div>
					);
				})()}
				{/* CP 세로선 클릭 → trackPointIndex 핀 (차트 mousedown과 분리) */}
				{onPin != null &&
					visibleCPs.map((cp) => {
						const span = visibleEnd - visibleStart;
						const leftPct =
							span > 0
								? ((cp.distanceKm - visibleStart) / span) * 100
								: 0;
						return (
							<button
								key={`cp-hit-${cp.id}`}
								type="button"
								aria-label={`${cp.name} 위치로 고정`}
								className="absolute inset-y-0 z-8 w-5 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0"
								style={{
									left: `${Math.max(0, Math.min(100, leftPct))}%`,
								}}
								onMouseDown={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onPin(cp.trackPointIndex);
								}}
							/>
						);
					})}
				{/* 경계 드래그 핸들 + 미리보기 툴팁 (차트 위 오버레이) */}
				{canDragBoundary && selectedStage && (
					<>
						<BoundaryHandle
							boundaryKm={boundaryKmForHandle}
							visibleStart={visibleStart}
							visibleEnd={visibleEnd}
							isDragging={isDragging}
							onMouseDown={(e) => {
								e.preventDefault();
								onStartBoundaryDrag?.(selectedStage.id, selectedStage.endDistanceKm);
								setIsDragging(true);
							}}
						/>
						{pendingStageEdit && pendingStage && (
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
						)}
					</>
				)}
			</div>
		</div>
	);
}
