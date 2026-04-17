"use client";

import { cn } from "@my-ridings/ui";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { MAP_VISUAL_PALETTE } from "@/app/constants/mapVisualPalette";
import {
	computeElevationGainCurve,
	computeTrackElevationGainLoss,
	type PendingStageEdit,
} from "../hooks/usePlanStages";
import type { Stage } from "../types/plan";
import { getStageColor, UNPLANNED_COLOR } from "../types/plan";

// ── 타입 ─────────────────────────────────────────────────────────
export interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도 (m)
	d?: number; // 누적 거리 (m)
}

type TrackPointWithElevation = TrackPoint & { e: number; d: number };

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

/** 모바일 공유 일정: 고도 차트에 표시할 단일 경유 포인트 포커스 */
export type ElevationScheduleMarkerFocus =
	| { kind: "cp"; id: number }
	| { kind: "summit"; id: string }
	| {
			kind: "plan_poi";
			id: string;
			distanceKm: number;
			name: string;
			elevationM: number;
			categoryLabel: string;
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
	/** 모바일 일정 탭: 가로 스크롤 pill 칩 + 전체 버튼 */
	alwaysShowChips?: boolean;
	/** 내부 칩/헤더 렌더를 전부 숨김. 외부에서 칩을 직접 제공할 때 사용 */
	hideChips?: boolean;
	/** 고정 차트 높이(px). 미지정 시 부모 flex 높이 100% */
	chartHeightPx?: number;
	/** Y축 폭·라벨 간소화 */
	compactYAxis?: boolean;
	/** 핀/호버 스크럽/세로 마커 비활성화 (공유 일정 탭) */
	disablePinAndHoverScrub?: boolean;
	/** 모바일 공유 일정 탭: 축 라벨에 맞춘 작은 툴팁 */
	compactTooltip?: boolean;
	/** 공유 일정: CP/정상/경유지 이름을 한 곳만 표시 */
	singleScheduleMarkerLabel?: boolean;
	/** `singleScheduleMarkerLabel`일 때 강조할 마커 */
	scheduleMarkerFocus?: ElevationScheduleMarkerFocus | null;
	/** 라벨 레이아웃: `stagger`는 인접 라벨이 가까울 때 2번째 줄로 번갈아 배치(모바일 공유 지도 탭용) */
	labelLayout?: "single" | "stagger";
	/** 종료 지점 단축 메뉴「수정」— 맵을 해당 누적 거리(km)로 센터·줌 + 고도 종료 변경 모드 */
	onStageEndBoundaryEditMapCenter?: (distanceKm: number) => void;
	/** 고도 차트 종료 지점 변경 모드(±5km 줌, 단축 메뉴 비표시) */
	stageEndBoundaryChartEditMode?: boolean;
	/** Esc 등으로 종료 지점 변경 모드 해제 */
	onExitStageEndBoundaryChartEditMode?: () => void;
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
	const withEle = points.filter(
		(p): p is TrackPointWithElevation => p.e != null && p.d != null,
	);
	if (withEle.length === 0) return [];

	const useSmoothedGain =
		typeof elevationCalibratedThreshold === "number" &&
		elevationCalibratedThreshold >= 0 &&
		stages.length > 0;

	// 스테이지별 스무딩 적용 상승고도 곡선 (elevationCalibratedThreshold 있을 때만 사용)
	const stageGainCurves: GainCurve[] =
		typeof elevationCalibratedThreshold === "number" &&
		elevationCalibratedThreshold >= 0 &&
		stages.length > 0
			? stages.map((stage) =>
					computeElevationGainCurve(
						points,
						stage.startDistanceKm,
						stage.endDistanceKm,
						elevationCalibratedThreshold,
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
				const prev = withEle[i - 1].e;
				const curr = withEle[i].e;
				cumulativeGain.push(cumulativeGain[i - 1] + Math.max(0, curr - prev));
			}
		}
	}

	const stageStartIndices: number[] = stages.map((stage) => {
		const idx = withEle.findIndex((p) => p.d / 1000 >= stage.startDistanceKm);
		return idx === -1 ? withEle.length : idx;
	});

	const findFirstIndexAtOrAfter = (distanceKm: number) => {
		const idx = withEle.findIndex((p) => p.d / 1000 >= distanceKm);
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
		const rawDistanceKm = withEle[withEleIndex].d / 1000;
		const distanceKm = Math.round(rawDistanceKm * 100) / 100;
		let stageIndex: number | null = null;
		for (let i = 0; i < stages.length; i++) {
			if (rawDistanceKm >= stages[i].startDistanceKm && rawDistanceKm <= stages[i].endDistanceKm) {
				stageIndex = i;
				break;
			}
		}

		const datum: ChartDatum = {
			distanceKm,
			ele: Math.round(withEle[withEleIndex].e),
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
					startIdx < withEleIndex ? cumulativeGain[withEleIndex] - cumulativeGain[startIdx] : 0,
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
	const nextStage = stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null;

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

// ── 드래그 중 툴팁 (원본 vs 새값 vs 증감) ──────────────────────────
function BoundaryTooltip({
	stage,
	previewStats,
	leftPct,
}: {
	stage: Stage;
	originalEndKm: number;
	previewEndKm: number;
	previewStats: PreviewStageStats | null;
	leftPct: number;
}) {
	const distDelta = previewStats ? previewStats.distanceKm - stage.distanceKm : 0;
	const gainDelta = previewStats ? previewStats.elevationGain - stage.elevationGain : 0;
	const lossDelta = previewStats ? previewStats.elevationLoss - stage.elevationLoss : 0;

	const formatDelta = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
	const formatDeltaKm = (v: number) => (v >= 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`);

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
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">{stage.dayNumber}일 경계</p>
			<div className="mt-1.5 space-y-0.5">
				<p className="text-zinc-500 dark:text-zinc-400">
					원본: {stage.distanceKm.toFixed(1)} km · +{stage.elevationGain}m / -{stage.elevationLoss}m
				</p>
				{previewStats && (
					<>
						<p className="text-zinc-800 dark:text-zinc-200">
							새값: {previewStats.distanceKm.toFixed(1)} km · +{previewStats.elevationGain}m / -
							{previewStats.elevationLoss}m
						</p>
						<p className="text-orange-600 dark:text-orange-400 font-medium">
							증감: {formatDeltaKm(distDelta)} km · {formatDelta(gainDelta)}m /{" "}
							{formatDelta(lossDelta)}m
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

/** 트랙 상에서 fromKm~toKm 구간의 단순 누적 상승고도(m). 고도 프로필 비스무딩 경로와 동일한 원시 합산. */
export function computeRawGainBetweenKm(
	points: TrackPoint[],
	fromKm: number,
	toKm: number,
): number {
	const withEle = points.filter(
		(p): p is TrackPointWithElevation => p.e != null && p.d != null,
	);
	if (withEle.length < 2 || toKm <= fromKm) return 0;
	const findIdx = (km: number) => {
		const idx = withEle.findIndex((p) => p.d / 1000 >= km);
		return idx === -1 ? withEle.length - 1 : idx;
	};
	const i0 = findIdx(fromKm);
	const i1 = findIdx(toKm);
	if (i1 <= i0) return 0;
	let gain = 0;
	for (let i = i0 + 1; i <= i1; i++) {
		const prevE = withEle[i - 1].e;
		const currE = withEle[i].e;
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
		typeof elevationCalibratedThreshold === "number" && elevationCalibratedThreshold >= 0;
	if (useSmooth) {
		return computeTrackElevationGainLoss(points, fromKm, toKm, elevationCalibratedThreshold).gain;
	}
	return computeRawGainBetweenKm(points, fromKm, toKm);
}

type ChartMarginBox = { top: number; right: number; left: number; bottom: number };

/** `tightChartMargin` 미사용 시 AreaChart·스케줄 툴팁 앵커 계산에 동일하게 사용 */
const DEFAULT_AREA_CHART_MARGIN: ChartMarginBox = {
	top: 20,
	right: 8,
	left: 0,
	bottom: 4,
};

/** 스테이지 종료 경계 호버 히트 폭 (세로 점선 기준 좌우) */
const STAGE_END_BOUNDARY_HIT_STRIP_PX = 24;
/** 종료 지점 단축 메뉴 대략 폭·높이(뷰포트 클램프용) */
const STAGE_END_BOUNDARY_MENU_W_PX = 232;
/** 메뉴 오른쪽 끝과 클릭 앵커 사이 간격(앵커는 커서 쪽, 메뉴는 왼편으로 펼침) */
const STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX = 8;
/** 종료 지점 변경 모드: X축 가시 구간 반폭(km) — 중앙에 경계, 좌우 각 5km */
const CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM = 5;

/** 선 오른쪽에 둘 때(툴팁 왼쪽 끝 = 앵커 + gap) */
const SCHEDULE_SELECTION_TOOLTIP_GAP_RIGHT_OF_LINE_PX = 10;
/** 선 왼쪽에 둘 때(툴팁 오른쪽 끝 = 앵커 - gap) */
const SCHEDULE_SELECTION_TOOLTIP_GAP_LEFT_OF_LINE_PX = 5;
/** 플롯 내 앵커가 차트 박스 가로 중심보다 왼쪽이면 툴팁을 선 오른쪽에 둔다 */
const SCHEDULE_SELECTION_TOOLTIP_RIGHT_PLACEMENT_MAX_CENTER_FR = 0.5;

/** AreaChart margin + YAxis width와 동일하게, 플롯 X 구간에 맞춘 앵커(px) */
function elevationYAxisReservedWidth(tightFixedHeightChart: boolean, compactYAxis: boolean): number {
	return tightFixedHeightChart ? 36 : compactYAxis ? 40 : 38;
}

/** Recharts 플롯과 동일한 X 앵커(px) + 세로선과 겹치지 않는 translateX — 스케줄·핀 오버레이 공통 */
type ElevationChartTooltipLineOffsetStyle = {
	left: number;
	translateX: string;
};

function elevationChartTooltipLineOffsetStyle(params: {
	km: number;
	visibleStart: number;
	visibleEnd: number;
	chartBoxWidth: number;
	margin: ChartMarginBox;
	yAxisWidth: number;
}): ElevationChartTooltipLineOffsetStyle {
	const { km, visibleStart, visibleEnd, chartBoxWidth, margin, yAxisWidth } = params;
	const span = visibleEnd - visibleStart;
	const plotLeft = margin.left + yAxisWidth;
	const plotRight = chartBoxWidth - margin.right;
	const plotW = Math.max(1, plotRight - plotLeft);
	const t = span > 0 ? (km - visibleStart) / span : 0.5;
	const anchorX = plotLeft + t * plotW;
	const placeTooltipRightOfLine =
		anchorX < chartBoxWidth * SCHEDULE_SELECTION_TOOLTIP_RIGHT_PLACEMENT_MAX_CENTER_FR;
	const translateX = placeTooltipRightOfLine
		? `translateX(${SCHEDULE_SELECTION_TOOLTIP_GAP_RIGHT_OF_LINE_PX}px)`
		: `translateX(calc(-100% - ${SCHEDULE_SELECTION_TOOLTIP_GAP_LEFT_OF_LINE_PX}px))`;
	return { left: anchorX, translateX };
}

/**
 * 스케줄 선택 km·고도 오버레이: 가로는 elevationChartTooltipLineOffsetStyle, 세로는 플롯 중앙.
 */
function scheduleSelectionTooltipPlotStyle(params: {
	km: number;
	visibleStart: number;
	visibleEnd: number;
	chartBoxWidth: number;
	margin: ChartMarginBox;
	yAxisWidth: number;
}): { left: number; top: string; transform: string } {
	const { left, translateX } = elevationChartTooltipLineOffsetStyle(params);
	return {
		left,
		top: "50%",
		transform: `${translateX} translateY(-50%)`,
	};
}

function nearestChartRowEleByKm(
	chartRows: Array<{ distanceKm: number; ele?: number | null }>,
	km: number,
): { distanceKm: number; ele: number } | null {
	let best: { distanceKm: number; ele: number } | null = null;
	for (const row of chartRows) {
		if (row.ele == null || Number.isNaN(Number(row.ele))) continue;
		const d = { distanceKm: row.distanceKm, ele: Number(row.ele) };
		if (!best || Math.abs(d.distanceKm - km) < Math.abs(best.distanceKm - km)) best = d;
	}
	return best;
}

// ── CP 마커 라벨 (Recharts ReferenceLine label) ──────────────────
const CP_COLOR = MAP_VISUAL_PALETTE.elevationCpStroke;
const SUMMIT_COLOR = CP_COLOR;
const CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE = 3;
/** stagger 레이아웃: 같은 row 인접 라벨의 기본 최소 허용 간격(px). 라벨 이름 폭이 작을 때의 하한. */
const LABEL_STAGGER_MIN_GAP_PX = 28;
/** 라벨 이름 글자 1개당 추정 폭(px). 한글 11px 폰트 기준. */
const LABEL_STAGGER_CHAR_WIDTH_PX = 11;
/** 인접 라벨 박스 사이 여백(px). */
const LABEL_STAGGER_GAP_PADDING_PX = 6;
/** stagger 레이아웃 최대 row (0-indexed). 현재 3줄까지 허용. */
const LABEL_STAGGER_MAX_ROW = 2;
/** row 한 칸당 수직 간격(px). font-size 11 + 여백. */
const LABEL_STAGGER_ROW_HEIGHT_PX = 14;

type LabelRow = 0 | 1 | 2;
type LabelRowEntry = { key: string; distanceKm: number; halfWidthPx: number };
type LabelRowResult = { rowByKey: Map<string, LabelRow>; maxRowUsed: LabelRow };

function estimateLabelHalfWidthPx(name: string): number {
	return (name.length * LABEL_STAGGER_CHAR_WIDTH_PX) / 2;
}

function computeLabelRows(params: {
	enabled: boolean;
	visibleStart: number;
	visibleEnd: number;
	chartBoxWidth: number;
	visibleCPs: CPOnRoute[];
	visibleSummits: SummitOnRoute[];
	useSingleScheduleLabel: boolean;
	scheduleMarkerFocus: ElevationScheduleMarkerFocus | null | undefined;
	showStageMarkerNames: boolean;
	planPoiFocusInView: boolean;
	selectedStageStartKm: number | null;
	selectedStageEndKm: number | null;
}): LabelRowResult {
	const rowByKey = new Map<string, LabelRow>();
	const {
		enabled,
		visibleStart,
		visibleEnd,
		chartBoxWidth,
		visibleCPs,
		visibleSummits,
		useSingleScheduleLabel,
		scheduleMarkerFocus,
		showStageMarkerNames,
		planPoiFocusInView,
		selectedStageStartKm,
		selectedStageEndKm,
	} = params;
	if (!enabled) return { rowByKey, maxRowUsed: 0 };
	const span = visibleEnd - visibleStart;
	if (span <= 0 || chartBoxWidth <= 0) return { rowByKey, maxRowUsed: 0 };
	const kmPerPx = span / chartBoxWidth;

	const isWithinStage = (distanceKm: number) => {
		if (selectedStageStartKm == null || selectedStageEndKm == null) return true;
		return distanceKm >= selectedStageStartKm && distanceKm <= selectedStageEndKm;
	};

	const entries: LabelRowEntry[] = [];
	const cpVisible = (cp: CPOnRoute) => {
		if (!isWithinStage(cp.distanceKm)) return false;
		return useSingleScheduleLabel
			? scheduleMarkerFocus?.kind === "cp" && scheduleMarkerFocus.id === cp.id
			: showStageMarkerNames;
	};
	const summitVisible = (summit: SummitOnRoute) => {
		if (!isWithinStage(summit.distanceKm)) return false;
		return useSingleScheduleLabel
			? scheduleMarkerFocus?.kind === "summit" && scheduleMarkerFocus.id === summit.id
			: showStageMarkerNames;
	};

	for (const cp of visibleCPs) {
		if (cpVisible(cp))
			entries.push({
				key: `cp-${cp.id}`,
				distanceKm: cp.distanceKm,
				halfWidthPx: estimateLabelHalfWidthPx(cp.name),
			});
	}
	for (const summit of visibleSummits) {
		if (summitVisible(summit))
			entries.push({
				key: `summit-${summit.id}`,
				distanceKm: summit.distanceKm,
				halfWidthPx: estimateLabelHalfWidthPx(summit.name),
			});
	}
	if (planPoiFocusInView && scheduleMarkerFocus?.kind === "plan_poi") {
		entries.push({
			key: "plan-poi-focus",
			distanceKm: scheduleMarkerFocus.distanceKm,
			halfWidthPx: estimateLabelHalfWidthPx(scheduleMarkerFocus.name),
		});
	}
	entries.sort((a, b) => a.distanceKm - b.distanceKm);

	type RowLast = { km: number; halfWidthPx: number };
	const lastByRow: Array<RowLast | null> = new Array(LABEL_STAGGER_MAX_ROW + 1).fill(null);

	/** 이전 라벨과의 간격이 두 라벨 박스를 피하기에 충분한지(라벨 이름 길이 반영). */
	const fitsInRow = (row: number, entry: LabelRowEntry): boolean => {
		const last = lastByRow[row];
		if (last == null) return true;
		const requiredPx = Math.max(
			LABEL_STAGGER_MIN_GAP_PX,
			last.halfWidthPx + entry.halfWidthPx + LABEL_STAGGER_GAP_PADDING_PX,
		);
		const gapPx = (entry.distanceKm - last.km) / kmPerPx;
		return gapPx >= requiredPx;
	};

	let maxRowUsed: LabelRow = 0;
	let lastChosenRow: LabelRow = 0;
	let hasPlacedAny = false;
	for (const entry of entries) {
		let chosenRow: LabelRow = 0;
		let placed = false;

		// 1) row 0에 들어갈 수 있으면 최우선 (밀도 낮을 때 빈 공간 방지)
		if (fitsInRow(0, entry)) {
			chosenRow = 0;
			placed = true;
		} else if (hasPlacedAny) {
			// 2) 라운드로빈: 직전에 배치한 row 다음부터 순회하며 들어갈 수 있는 row 탐색
			for (let step = 1; step <= LABEL_STAGGER_MAX_ROW; step++) {
				const r = ((lastChosenRow + step) % (LABEL_STAGGER_MAX_ROW + 1)) as LabelRow;
				if (fitsInRow(r, entry)) {
					chosenRow = r;
					placed = true;
					break;
				}
			}
		}

		// 3) 모든 row가 안 맞으면 "가장 오래 전에 배치된 row"에 폴백
		if (!placed) {
			let oldestRow: LabelRow = 0;
			let oldestKm = lastByRow[0]?.km ?? Infinity;
			for (let r = 1; r <= LABEL_STAGGER_MAX_ROW; r++) {
				const last = lastByRow[r];
				if (last != null && last.km < oldestKm) {
					oldestKm = last.km;
					oldestRow = r as LabelRow;
				}
			}
			chosenRow = oldestRow;
		}

		rowByKey.set(entry.key, chosenRow);
		lastByRow[chosenRow] = { km: entry.distanceKm, halfWidthPx: entry.halfWidthPx };
		lastChosenRow = chosenRow;
		hasPlacedAny = true;
		if (chosenRow > maxRowUsed) maxRowUsed = chosenRow;
	}
	return { rowByKey, maxRowUsed };
}

function CPMarkerLabel({
	viewBox,
	showName,
	name,
	row = 0,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
	row?: LabelRow;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	const labelY = y - 4 - row * LABEL_STAGGER_ROW_HEIGHT_PX;
	return (
		<g>
			<polygon points={`${x - triW},${y} ${x + triW},${y} ${x},${y + triH}`} fill={CP_COLOR} />
			{showName && row > 0 && (
				<line x1={x} y1={y - 2} x2={x} y2={labelY + 2} stroke="#d4d4d8" strokeWidth={0.5} />
			)}
			{showName && (
				<text
					x={x}
					y={labelY}
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
	row = 0,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
	row?: LabelRow;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	const labelY = y - 4 - row * LABEL_STAGGER_ROW_HEIGHT_PX;
	return (
		<g>
			<polygon
				points={`${x - triW},${y + triH} ${x + triW},${y + triH} ${x},${y}`}
				fill={SUMMIT_COLOR}
			/>
			{showName && row > 0 && (
				<line x1={x} y1={y - 2} x2={x} y2={labelY + 2} stroke="#d4d4d8" strokeWidth={0.5} />
			)}
			{showName && (
				<text
					x={x}
					y={labelY}
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

const PLAN_POI_MARKER_COLOR = "#2563eb";

function PlanPoiMarkerLabel({
	viewBox,
	showName,
	name,
	row = 0,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
	row?: LabelRow;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	const labelY = y - 4 - row * LABEL_STAGGER_ROW_HEIGHT_PX;
	return (
		<g>
			<polygon
				points={`${x - triW},${y} ${x + triW},${y} ${x},${y + triH}`}
				fill={PLAN_POI_MARKER_COLOR}
			/>
			{showName && row > 0 && (
				<line x1={x} y1={y - 2} x2={x} y2={labelY + 2} stroke="#d4d4d8" strokeWidth={0.5} />
			)}
			{showName && (
				<text
					x={x}
					y={labelY}
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

/** 호버 툴팁(CustomTooltip)과 모바일 일정 선택 km·고도 오버레이에 공통 적용.
 * `backdrop-blur`는 sticky 부모 등과 겹칠 때 샘플링이 깨져 불투명하게 보일 수 있어 제외하고, 알파 배경만으로 비침을 낸다. */
const ELEVATION_CHART_TOOLTIP_PANEL_CLASS =
	"rounded-lg border border-white/15 bg-zinc-950/50 text-zinc-100 shadow-md";

type ScheduleSelectionKmEleTooltipProps = {
	km: number;
	ele: number;
	compactTooltip: boolean;
	style: CSSProperties;
};

function ScheduleSelectionKmEleTooltip({
	km,
	ele,
	compactTooltip,
	style,
}: ScheduleSelectionKmEleTooltipProps) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute z-20 box-border w-max max-w-[min(280px,calc(100%-12px))] shrink-0",
				ELEVATION_CHART_TOOLTIP_PANEL_CLASS,
				compactTooltip ? "px-2 py-1.5 text-[10px] leading-snug" : "px-3 py-2 text-xs",
			)}
			style={style}
		>
			<div className="font-medium tabular-nums">
				{km.toFixed(1)} km · △ {ele} m
			</div>
		</div>
	);
}

// ── 차트·맵 공용 호버/핀 툴팁 ─────────────────────────────────────
type ElevationHoverTooltipProps = {
	datum: ChartDatum;
	trackPoints: TrackPoint[];
	cpMarkers: CPOnRoute[];
	elevationCalibratedThreshold?: number;
	cpAnchorMinKm: number;
	cpAnchorMaxKm: number;
	anchorFallbackDayNumber: number | null;
	compactTooltip: boolean;
	pinned: boolean;
	placementStyle: CSSProperties;
	onUnpin?: () => void;
};

function ElevationHoverTooltip({
	datum,
	trackPoints,
	cpMarkers,
	elevationCalibratedThreshold,
	cpAnchorMinKm,
	cpAnchorMaxKm,
	anchorFallbackDayNumber,
	compactTooltip,
	pinned,
	placementStyle,
	onUnpin,
}: ElevationHoverTooltipProps) {
	const km = datum.distanceKm;
	const ele = datum.ele;
	const hasStageStats =
		typeof datum.distanceFromStageStartKm === "number" &&
		typeof datum.elevationGainFromStageStart === "number";
	const prevCp = findPrevCPInContext(cpMarkers, km, cpAnchorMinKm);
	const segFromKm = prevCp?.distanceKm ?? cpAnchorMinKm;
	const segDist = Math.round((km - segFromKm) * 10) / 10;
	const segGain =
		cpMarkers.length > 0 && trackPoints.length > 0
			? computeSegmentGainBetweenKm(trackPoints, segFromKm, km, elevationCalibratedThreshold)
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
	const remainKm = nextTargetKm != null ? Math.round((nextTargetKm - km) * 10) / 10 : null;
	const remainGain =
		nextTargetKm != null && trackPoints.length > 0
			? computeSegmentGainBetweenKm(trackPoints, km, nextTargetKm, elevationCalibratedThreshold)
			: null;

	const rowGap = compactTooltip ? "gap-3" : "gap-4";
	const blockY = compactTooltip ? "mt-0.5" : "mt-1";
	const cpTop = compactTooltip ? "pt-0.5" : "pt-1";

	const panelClass = pinned
		? "rounded-lg border border-orange-300 bg-white shadow-lg dark:border-orange-600 dark:bg-zinc-800"
		: ELEVATION_CHART_TOOLTIP_PANEL_CLASS;
	const titleTextClass = pinned ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-100";
	const stageTextClass = pinned ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-300";
	const cpTextClass = pinned ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-400";
	const cpBorderClass = pinned ? "border-zinc-200 dark:border-zinc-600" : "border-white/10";
	const hintTextClass = pinned ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400";

	const body = (
		<>
			<span className={cn("flex justify-between font-semibold", titleTextClass, rowGap)}>
				<span>{pinned ? "📌 전체" : "전체"}</span>
				<span>
					{km.toFixed(1)} km · △ {ele} m
				</span>
			</span>
			{hasStageStats && (
				<span className={cn("flex justify-between", stageTextClass, blockY, rowGap)}>
					<span>스테이지</span>
					<span>
						+{Number(datum.distanceFromStageStartKm).toFixed(1)} km · ▲{" "}
						{datum.elevationGainFromStageStart} m
					</span>
				</span>
			)}
			{cpMarkers.length > 0 && (
				<span
					className={cn("flex flex-col space-y-0.5 border-t", cpBorderClass, blockY, cpTop)}
				>
					<span className={cn("flex justify-between", cpTextClass, rowGap)}>
						<span>{cpSegLabel}</span>
						<span>
							+{segDist.toFixed(1)} km · ▲ {segGain} m
						</span>
					</span>
					{nextTargetLabel != null && remainKm != null && remainGain != null && (
						<span className={cn("flex justify-between", cpTextClass, rowGap)}>
							<span>{nextTargetLabel}</span>
							<span>
								{remainKm.toFixed(1)} km · ▲ {remainGain} m
							</span>
						</span>
					)}
				</span>
			)}
			{pinned && (
				<span className={cn("block text-center", hintTextClass, blockY)}>클릭하여 해제</span>
			)}
		</>
	);

	const sizeClass = compactTooltip
		? "min-w-[168px] max-w-[min(100%,280px)] px-2 py-1.5 text-[10px] leading-snug"
		: "min-w-[200px] px-3 py-2 text-xs";

	if (pinned) {
		return (
			<button
				type="button"
				aria-label="고정 툴팁 해제"
				className={cn(
					"pointer-events-auto absolute z-20 cursor-pointer text-left font-normal",
					panelClass,
					sizeClass,
				)}
				style={placementStyle}
				onClick={(e) => {
					e.stopPropagation();
					onUnpin?.();
				}}
			>
				{body}
			</button>
		);
	}

	return (
		<div
			className={cn("pointer-events-none absolute z-20", panelClass, sizeClass)}
			style={placementStyle}
		>
			{body}
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
	alwaysShowChips = false,
	hideChips = false,
	chartHeightPx,
	compactYAxis = false,
	disablePinAndHoverScrub = false,
	compactTooltip = false,
	singleScheduleMarkerLabel = false,
	scheduleMarkerFocus = null,
	labelLayout = "single",
	onStageEndBoundaryEditMapCenter,
	stageEndBoundaryChartEditMode = false,
	onExitStageEndBoundaryChartEditMode,
}: ElevationProfileProps) {
	const chartInteractionDisabled = disablePinAndHoverScrub || stageEndBoundaryChartEditMode;
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const stageEndBoundaryHitStripRef = useRef<HTMLButtonElement>(null);
	const stageEndBoundaryMenuRef = useRef<HTMLDivElement>(null);
	const [chartBoxWidth, setChartBoxWidth] = useState(0);
	const [isHoveringStageEndBoundary, setIsHoveringStageEndBoundary] = useState(false);
	const [stageEndBoundaryMenuAnchor, setStageEndBoundaryMenuAnchor] = useState<{
		leftPx: number;
		topPx: number;
	} | null>(null);
	const frozenVisibleRangeRef = useRef<{ startKm: number; endKm: number } | null>(null);

	useLayoutEffect(() => {
		const root = chartContainerRef.current;
		if (!root) return;
		const measure = () => {
			setChartBoxWidth(root.clientWidth);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		return () => ro.disconnect();
	}, []);

	const rawChartData = useMemo(
		() => buildChartData(trackPoints, stages, elevationCalibratedThreshold),
		[trackPoints, stages, elevationCalibratedThreshold],
	);

	const hasStages = stages.length > 0;
	const totalKm = rawChartData.length > 0 ? rawChartData[rawChartData.length - 1].distanceKm : 0;

	const computedVisibleRange = useMemo(() => {
		if (!hasStages || selectedDayNumber == null) return { startKm: 0, endKm: totalKm };
		return computeVisibleRange(stages, selectedDayNumber, totalKm);
	}, [hasStages, selectedDayNumber, stages, totalKm]);

	const boundaryKmForVisibleZoom = useMemo(() => {
		if (pendingStageEdit) return pendingStageEdit.previewEndKm;
		if (hasStages && selectedDayNumber != null) {
			const stage = stages.find((s) => s.dayNumber === selectedDayNumber);
			return stage?.endDistanceKm ?? 0;
		}
		return 0;
	}, [pendingStageEdit, hasStages, selectedDayNumber, stages]);

	const { startKm: visibleStart, endKm: visibleEnd } = useMemo(() => {
		if (!pendingStageEdit) {
			frozenVisibleRangeRef.current = null;
			if (stageEndBoundaryChartEditMode && totalKm > 0) {
				const center = boundaryKmForVisibleZoom;
				return {
					startKm: Math.max(0, center - CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
					endKm: Math.min(totalKm, center + CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
				};
			}
			return computedVisibleRange;
		}
		if (!frozenVisibleRangeRef.current) {
			const base =
				stageEndBoundaryChartEditMode && totalKm > 0
					? {
							startKm: Math.max(0, boundaryKmForVisibleZoom - CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
							endKm: Math.min(totalKm, boundaryKmForVisibleZoom + CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
						}
					: computedVisibleRange;
			frozenVisibleRangeRef.current = base;
		}
		return frozenVisibleRangeRef.current;
	}, [
		pendingStageEdit,
		computedVisibleRange,
		stageEndBoundaryChartEditMode,
		boundaryKmForVisibleZoom,
		totalKm,
	]);

	const clippedChartData = useMemo(() => {
		if (selectedDayNumber == null) return rawChartData;
		return rawChartData.filter((d) => d.distanceKm >= visibleStart && d.distanceKm <= visibleEnd);
	}, [rawChartData, selectedDayNumber, visibleStart, visibleEnd]);

	const { data: multiStageData, keys: stageKeys } = useMemo(
		() => buildStageKeys(clippedChartData, stages),
		[clippedChartData, stages],
	);

	const chartData = hasStages ? multiStageData : clippedChartData;

	const scheduleSelectionOverlay = useMemo(() => {
		if (!disablePinAndHoverScrub || !singleScheduleMarkerLabel || !scheduleMarkerFocus) return null;
		let km: number;
		let fallbackEle: number;
		const f = scheduleMarkerFocus;
		if (f.kind === "cp") {
			const cp = cpMarkers.find((c) => c.id === f.id);
			if (!cp) return null;
			km = cp.distanceKm;
			fallbackEle = Math.round(cp.elevation);
		} else if (f.kind === "summit") {
			const s = summitMarkers.find((x) => x.id === f.id);
			if (!s) return null;
			km = s.distanceKm;
			fallbackEle = Math.round(s.elevation);
		} else {
			km = f.distanceKm;
			fallbackEle = f.elevationM;
		}
		if (km < visibleStart || km > visibleEnd) return null;
		const best = nearestChartRowEleByKm(
			chartData as Array<{ distanceKm: number; ele?: number | null }>,
			km,
		);
		const ele = best?.ele ?? fallbackEle;
		return { km, ele };
	}, [
		disablePinAndHoverScrub,
		singleScheduleMarkerLabel,
		scheduleMarkerFocus,
		cpMarkers,
		summitMarkers,
		visibleStart,
		visibleEnd,
		chartData,
	]);

	type TooltipState = {
		activeTooltipIndex?: number | string | null;
	};

	const getChartDataIndexAtTooltip = useCallback(
		(state: TooltipState): number | null => {
			const tooltipIndex = state.activeTooltipIndex;
			if (tooltipIndex == null) return null;
			const normalizedTooltipIndex =
				typeof tooltipIndex === "string" ? Number(tooltipIndex) : tooltipIndex;
			if (!Number.isInteger(normalizedTooltipIndex)) return null;
			const row = chartData[normalizedTooltipIndex] as { index?: number } | undefined;
			return typeof row?.index === "number" ? row.index : null;
		},
		[chartData],
	);

	const handleMouseMove = useCallback(
		(state: TooltipState) => {
			if (chartInteractionDisabled) return;
			const index = getChartDataIndexAtTooltip(state);
			if (index == null) return;
			lastHoverIndexRef.current = index;
			if (!isPinned && onPositionChange) onPositionChange(index);
		},
		[getChartDataIndexAtTooltip, onPositionChange, isPinned, chartInteractionDisabled],
	);

	const handleMouseLeave = useCallback(() => {
		// 마우스 벗어나도 마커 유지 (null 전달하지 않음)
	}, []);

	const lastHoverIndexRef = useRef<number | null>(null);

	const handleChartClick = useCallback(() => {
		if (chartInteractionDisabled) return;
		if (isPinned && onUnpin) {
			onUnpin();
			return;
		}
		if (!onPin || lastHoverIndexRef.current == null) return;
		onPin(lastHoverIndexRef.current);
	}, [isPinned, onPin, onUnpin, chartInteractionDisabled]);

	const selectedStage =
		hasStages && selectedDayNumber != null
			? (stages.find((s) => s.dayNumber === selectedDayNumber) ?? null)
			: null;
	const selectedStageIdx =
		selectedStage != null ? stages.findIndex((s) => s.id === selectedStage.id) : -1;
	const isLastStage = selectedStageIdx >= 0 && selectedStageIdx === stages.length - 1;
	const canDragBoundary =
		selectedStage != null && !isLastStage && onStartBoundaryDrag != null && onPreviewMove != null;

	const handleBoundaryDrag = useCallback(
		(clientX: number) => {
			if (!chartContainerRef.current || !selectedStage || !onPreviewMove) return;
			const rect = chartContainerRef.current.getBoundingClientRect();
			const span = visibleEnd - visibleStart;
			if (span <= 0) return;
			const km = visibleStart + ((clientX - rect.left) / rect.width) * span;
			onPreviewMove(selectedStage.id, Math.round(km * 10) / 10);
		},
		[selectedStage, visibleStart, visibleEnd, onPreviewMove],
	);

	const handleBoundaryDragRef = useRef(handleBoundaryDrag);
	handleBoundaryDragRef.current = handleBoundaryDrag;

	const boundaryDragWindowHandlersRef = useRef<{
		move: (ev: PointerEvent) => void;
		up: (ev: PointerEvent) => void;
	} | null>(null);

	const endBoundaryWindowDrag = useCallback(() => {
		const h = boundaryDragWindowHandlersRef.current;
		if (h) {
			window.removeEventListener("pointermove", h.move);
			window.removeEventListener("pointerup", h.up);
			window.removeEventListener("pointercancel", h.up);
			boundaryDragWindowHandlersRef.current = null;
		}
	}, []);

	const beginBoundaryWindowDrag = useCallback(
		(clientX: number, pointerId: number) => {
			if (boundaryDragWindowHandlersRef.current != null) return;
			const move = (ev: PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				ev.preventDefault();
				handleBoundaryDragRef.current(ev.clientX);
			};
			const up = (ev: PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				endBoundaryWindowDrag();
			};
			boundaryDragWindowHandlersRef.current = { move, up };
			window.addEventListener("pointermove", move, { passive: false });
			window.addEventListener("pointerup", up);
			window.addEventListener("pointercancel", up);
			handleBoundaryDragRef.current(clientX);
		},
		[endBoundaryWindowDrag],
	);

	useEffect(() => {
		return () => {
			endBoundaryWindowDrag();
		};
	}, [endBoundaryWindowDrag]);

	const stageEndBoundaryUiResetKey = `${selectedDayNumber}\0${pendingStageEdit?.stageId ?? ""}\0${pendingStageEdit == null}`;

	useEffect(() => {
		void stageEndBoundaryUiResetKey;
		setIsHoveringStageEndBoundary(false);
		setStageEndBoundaryMenuAnchor(null);
		endBoundaryWindowDrag();
	}, [stageEndBoundaryUiResetKey, endBoundaryWindowDrag]);

	useEffect(() => {
		if (stageEndBoundaryMenuAnchor == null && !stageEndBoundaryChartEditMode) return;
		const onPointerDown = (e: PointerEvent) => {
			if (stageEndBoundaryMenuAnchor == null) return;
			const t = e.target as Node;
			if (stageEndBoundaryMenuRef.current?.contains(t)) return;
			if (stageEndBoundaryHitStripRef.current?.contains(t)) return;
			setStageEndBoundaryMenuAnchor(null);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			if (stageEndBoundaryMenuAnchor != null) {
				setStageEndBoundaryMenuAnchor(null);
				return;
			}
			if (stageEndBoundaryChartEditMode) onExitStageEndBoundaryChartEditMode?.();
		};
		if (stageEndBoundaryMenuAnchor != null) {
			document.addEventListener("pointerdown", onPointerDown);
		}
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [
		stageEndBoundaryMenuAnchor,
		stageEndBoundaryChartEditMode,
		onExitStageEndBoundaryChartEditMode,
	]);

	useEffect(() => {
		if (!pendingStageEdit) endBoundaryWindowDrag();
	}, [pendingStageEdit, endBoundaryWindowDrag]);

	const currentChartDatum = useMemo(() => {
		if (positionIndex == null || rawChartData.length === 0) return null;
		return rawChartData.reduce<ChartDatum | null>((best, d) => {
			if (!best) return d;
			return Math.abs(d.index - positionIndex) < Math.abs(best.index - positionIndex) ? d : best;
		}, null);
	}, [positionIndex, rawChartData]);

	const stageEndBoundaryMenuPosition = useMemo(() => {
		if (stageEndBoundaryMenuAnchor == null) return null;
		const { leftPx } = stageEndBoundaryMenuAnchor;
		if (chartBoxWidth <= 0) return { left: Math.max(0, leftPx), top: "50%" as const };
		const minAnchorX =
			STAGE_END_BOUNDARY_MENU_W_PX + STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX + 8;
		const anchorX = Math.max(minAnchorX, Math.min(leftPx, chartBoxWidth - 8));
		return {
			left: anchorX,
			top: "50%" as const,
		};
	}, [stageEndBoundaryMenuAnchor, chartBoxWidth]);

	const visibleCPs = cpMarkers.filter(
		(cp) => cp.distanceKm >= visibleStart && cp.distanceKm <= visibleEnd,
	);
	const showStageMarkerNames = selectedDayNumber != null;
	const visibleSummits = showStageMarkerNames
		? summitMarkers
				.filter((summit) => summit.distanceKm >= visibleStart && summit.distanceKm <= visibleEnd)
				.filter(
					(summit) =>
						!visibleCPs.some(
							(cp) =>
								Math.abs(cp.trackPointIndex - summit.trackPointIndex) <=
								CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE,
						),
				)
		: [];
	const useSingleScheduleLabel =
		Boolean(singleScheduleMarkerLabel) && showStageMarkerNames && scheduleMarkerFocus != null;

	/** 선택된 스테이지 구간 내(경계 포함)인지 — 인접 스테이지 오버랩 구간의 라벨은 숨김 */
	const isWithinSelectedStage = (distanceKm: number) => {
		if (selectedStage == null) return true;
		return (
			distanceKm >= selectedStage.startDistanceKm && distanceKm <= selectedStage.endDistanceKm
		);
	};

	const cpNameVisible = (cp: CPOnRoute) => {
		if (!isWithinSelectedStage(cp.distanceKm)) return false;
		if (!useSingleScheduleLabel) return showStageMarkerNames;
		const f = scheduleMarkerFocus;
		return f?.kind === "cp" && f.id === cp.id;
	};

	const summitNameVisible = (summit: SummitOnRoute) => {
		if (!isWithinSelectedStage(summit.distanceKm)) return false;
		if (!useSingleScheduleLabel) return showStageMarkerNames;
		const f = scheduleMarkerFocus;
		return f?.kind === "summit" && f.id === summit.id;
	};

	const planPoiFocusInView =
		useSingleScheduleLabel &&
		scheduleMarkerFocus?.kind === "plan_poi" &&
		scheduleMarkerFocus.distanceKm >= visibleStart &&
		scheduleMarkerFocus.distanceKm <= visibleEnd;

	/** 라벨 stagger: 라벨이 조밀할수록 위쪽 row로 밀어 최대 3줄까지 사용. 빈 공간이면 row 0만 사용. */
	const { rowByKey: labelRowByKey, maxRowUsed: maxLabelRowUsed } = computeLabelRows({
		enabled: labelLayout === "stagger",
		visibleStart,
		visibleEnd,
		chartBoxWidth,
		visibleCPs,
		visibleSummits,
		useSingleScheduleLabel,
		scheduleMarkerFocus,
		showStageMarkerNames,
		planPoiFocusInView,
		selectedStageStartKm: selectedStage?.startDistanceKm ?? null,
		selectedStageEndKm: selectedStage?.endDistanceKm ?? null,
	});

	const tooltipCpAnchorKm = selectedStage?.startDistanceKm ?? 0;
	const tooltipCpAnchorMaxKm = selectedStage?.endDistanceKm ?? totalKm;
	const tooltipAnchorDayNumber = selectedStage?.dayNumber ?? null;

	const tightFixedHeightChart =
		typeof chartHeightPx === "number" && chartHeightPx > 0 && compactYAxis;

	/** 고정 높이+컴팩트 축: 일차 선택 시 CP/정상 이름이 위로 잘리지 않도록 플롯 상단 여백 확보 */
	const tightChartMargin = tightFixedHeightChart
		? {
				top:
					showStageMarkerNames &&
					(visibleCPs.length > 0 || visibleSummits.length > 0 || planPoiFocusInView)
						? 16
						: 6,
				right: 4,
				left: 0,
				bottom: 2,
			}
		: null;

	/** 실제로 사용된 stagger row 수만큼만 상단 여백을 동적으로 확보해, POI 적은 스테이지에 빈 공간 방지 */
	const baseChartMargin = tightChartMargin ?? DEFAULT_AREA_CHART_MARGIN;
	const staggerTopExtraPx =
		maxLabelRowUsed > 0 ? maxLabelRowUsed * LABEL_STAGGER_ROW_HEIGHT_PX + 4 : 0;
	const effectiveChartMargin =
		staggerTopExtraPx > 0
			? { ...baseChartMargin, top: Math.max(baseChartMargin.top, 14 + staggerTopExtraPx) }
			: baseChartMargin;

	const pillChipRow =
		!hideChips && alwaysShowChips && hasStages ? (
			<div className="mb-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<button
					type="button"
					onClick={() => onSelectedDayChange?.(null)}
					className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
						selectedDayNumber == null
							? "bg-orange-500 text-white"
							: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
					}`}
				>
					전체
				</button>
				{stages.map((s) => {
					const color = getStageColor(s.dayNumber);
					const isSel = selectedDayNumber === s.dayNumber;
					return (
						<button
							key={s.id}
							type="button"
							onClick={() => onSelectedDayChange?.(s.dayNumber)}
							className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
								isSel
									? "text-white"
									: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
							}`}
							style={isSel ? { backgroundColor: color.stroke } : undefined}
						>
							{s.dayNumber}일
						</button>
					);
				})}
			</div>
		) : null;

	const marginForScheduleTooltip = effectiveChartMargin;
	const yAxisWidthForScheduleTooltip = elevationYAxisReservedWidth(
		tightFixedHeightChart,
		compactYAxis,
	);
	const scheduleTooltipStyle =
		scheduleSelectionOverlay != null && chartBoxWidth > 0
			? scheduleSelectionTooltipPlotStyle({
					km: scheduleSelectionOverlay.km,
					visibleStart,
					visibleEnd,
					chartBoxWidth,
					margin: marginForScheduleTooltip,
					yAxisWidth: yAxisWidthForScheduleTooltip,
				})
			: null;

	const hoverTooltipPlacementStyle = useMemo((): CSSProperties | null => {
		if (currentChartDatum == null) return null;
		if (chartBoxWidth <= 0) {
			const span = visibleEnd - visibleStart;
			const leftPct = span > 0 ? ((currentChartDatum.distanceKm - visibleStart) / span) * 100 : 50;
			return {
				left: `${Math.max(4, Math.min(96, leftPct))}%`,
				top: 4,
				transform:
					leftPct > 60
						? `translateX(calc(-100% - ${SCHEDULE_SELECTION_TOOLTIP_GAP_LEFT_OF_LINE_PX}px))`
						: `translateX(${SCHEDULE_SELECTION_TOOLTIP_GAP_RIGHT_OF_LINE_PX}px)`,
			};
		}
		const { left, translateX } = elevationChartTooltipLineOffsetStyle({
			km: currentChartDatum.distanceKm,
			visibleStart,
			visibleEnd,
			chartBoxWidth,
			margin: marginForScheduleTooltip,
			yAxisWidth: yAxisWidthForScheduleTooltip,
		});
		return { left, top: 4, transform: translateX };
	}, [
		currentChartDatum,
		chartBoxWidth,
		visibleStart,
		visibleEnd,
		marginForScheduleTooltip,
		yAxisWidthForScheduleTooltip,
	]);

	if (rawChartData.length === 0) {
		const chipRow =
			!hideChips && alwaysShowChips && hasStages ? (
				<div className="mb-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<button
						type="button"
						onClick={() => onSelectedDayChange?.(null)}
						className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
							selectedDayNumber == null
								? "bg-orange-500 text-white"
								: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
						}`}
					>
						전체
					</button>
					{stages.map((s) => {
						const color = getStageColor(s.dayNumber);
						const isSel = selectedDayNumber === s.dayNumber;
						return (
							<button
								key={s.id}
								type="button"
								onClick={() => onSelectedDayChange?.(s.dayNumber)}
								className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
									isSel
										? "text-white"
										: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
								}`}
								style={isSel ? { backgroundColor: color.stroke } : undefined}
							>
								{s.dayNumber}일
							</button>
						);
					})}
				</div>
			) : null;

		const emptyChart = (
			<div
				className="flex w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
				style={{ minHeight: chartHeightPx ?? 88 }}
			>
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);

		if (alwaysShowChips && hasStages) {
			return (
				<div className="flex w-full flex-col gap-1 px-1 pt-1">
					{chipRow}
					{emptyChart}
				</div>
			);
		}

		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);
	}

	const pendingStage = pendingStageEdit
		? (stages.find((s) => s.id === pendingStageEdit.stageId) ?? null)
		: null;
	const boundaryKmForHandle = pendingStageEdit
		? pendingStageEdit.previewEndKm
		: (selectedStage?.endDistanceKm ?? 0);

	// Stage 경계선: 표시 구간 내의 것만. pending인 경계는 별도 처리 (점선+실선)
	const stageBoundaries = stages
		.map((s) => ({ distanceKm: s.endDistanceKm, stageId: s.id, label: `Stage ${s.dayNumber}` }))
		.filter(
			(b) =>
				b.distanceKm >= visibleStart &&
				b.distanceKm <= visibleEnd &&
				!(pendingStageEdit && b.stageId === pendingStageEdit.stageId),
		);

	const stageEndBoundaryHitLeftPct =
		canDragBoundary && visibleEnd > visibleStart
			? Math.max(
					0,
					Math.min(100, ((boundaryKmForHandle - visibleStart) / (visibleEnd - visibleStart)) * 100),
				)
			: null;

	return (
		<div
			className={
				chartHeightPx != null
					? tightFixedHeightChart
						? "flex w-full flex-col gap-1 pl-1 pr-2 pt-1.5"
						: "flex w-full flex-col gap-1 px-2 pt-2"
					: "flex h-full w-full flex-col gap-1 px-2 pt-2"
			}
		>
			{hideChips ? null : alwaysShowChips && hasStages ? (
				pillChipRow
			) : (
				<div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
					<div className="flex min-w-0 items-center gap-3">
						<span className="shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
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
											onClick={() => onSelectedDayChange?.(isSelected ? null : s.dayNumber)}
											className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
												isSelected
													? "bg-zinc-200 font-semibold dark:bg-zinc-600"
													: "hover:bg-zinc-100 dark:hover:bg-zinc-700"
											} ${isActive ? "ring-1 ring-zinc-400 ring-offset-1" : ""}`}
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
				</div>
			)}

			{/* 차트 */}
			<div
				ref={chartContainerRef}
				className={
					chartHeightPx != null
						? "relative w-full shrink-0 overflow-visible"
						: "relative min-h-0 flex-1 overflow-visible"
				}
				style={chartHeightPx != null ? { height: chartHeightPx } : undefined}
			>
				{pendingStageEdit != null && (
					<div className="pointer-events-none absolute inset-0 z-30">
						<div className="pointer-events-auto absolute top-2 right-2 flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95">
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
								className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
							>
								적용
							</button>
						</div>
					</div>
				)}
				<ResponsiveContainer width="100%" height={chartHeightPx != null ? chartHeightPx : "100%"}>
					<AreaChart
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						data={chartData as any}
						margin={effectiveChartMargin}
						onMouseMove={chartInteractionDisabled ? undefined : handleMouseMove}
						onMouseLeave={chartInteractionDisabled ? undefined : handleMouseLeave}
						onMouseDown={chartInteractionDisabled ? undefined : handleChartClick}
					>
						<defs>
							{/* 기본 그라디언트 (Stage 없을 때) */}
							<linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
								<stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
							</linearGradient>
							{/* Stage별 그라디언트 */}
							{stages.map((s, i) => {
								const color = getStageColor(s.dayNumber);
								return (
									<linearGradient key={s.id} id={`stageGradient_${i}`} x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor={color.stroke}
											stopOpacity={activeStageId === s.id ? 0.6 : 0.35}
										/>
										<stop offset="95%" stopColor={color.stroke} stopOpacity={0.05} />
									</linearGradient>
								);
							})}
							{/* 미계획 그라디언트 */}
							<linearGradient id="unplannedGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={UNPLANNED_COLOR.stroke} stopOpacity={0.2} />
								<stop offset="95%" stopColor={UNPLANNED_COLOR.stroke} stopOpacity={0.02} />
							</linearGradient>
						</defs>

						<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />

						<XAxis
							dataKey="distanceKm"
							type="number"
							domain={
								selectedDayNumber != null ? [visibleStart, visibleEnd] : ["dataMin", "dataMax"]
							}
							tickFormatter={(v: number) => {
								const rounded = Math.round(v * 10) / 10;
								return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
							}}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							tickMargin={tightFixedHeightChart ? 2 : 6}
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
							width={elevationYAxisReservedWidth(tightFixedHeightChart, compactYAxis)}
							label={
								compactYAxis
									? undefined
									: {
											value: "m",
											angle: -90,
											position: "insideLeft",
											style: { fill: "#9ca3af", fontSize: 10 },
										}
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
							stageBoundaries.map((b) => {
								const isHoveredBoundary =
									isHoveringStageEndBoundary &&
									selectedStage != null &&
									b.stageId === selectedStage.id;
								return (
									<ReferenceLine
										key={`boundary-${b.stageId}`}
										x={b.distanceKm}
										stroke={isHoveredBoundary ? "#3b82f6" : "#a1a1aa"}
										strokeWidth={isHoveredBoundary ? 3 : 1}
										strokeDasharray={isHoveredBoundary ? undefined : "3 3"}
									/>
								);
							})}
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
									stroke={isHoveringStageEndBoundary ? "#60a5fa" : "#3b82f6"}
									strokeWidth={isHoveringStageEndBoundary ? 3 : 2}
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
										showName={cpNameVisible(cp)}
										name={cp.name}
										row={labelRowByKey.get(`cp-${cp.id}`) ?? 0}
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
										showName={summitNameVisible(summit)}
										name={summit.name}
										row={labelRowByKey.get(`summit-${summit.id}`) ?? 0}
									/>
								}
							/>
						))}
						{planPoiFocusInView && scheduleMarkerFocus?.kind === "plan_poi" ? (
							<ReferenceLine
								key="plan-poi-schedule-focus"
								x={scheduleMarkerFocus.distanceKm}
								stroke={PLAN_POI_MARKER_COLOR}
								strokeWidth={0.5}
								strokeDasharray="2 3"
								label={
									<PlanPoiMarkerLabel
										showName
										name={scheduleMarkerFocus.name}
										row={labelRowByKey.get("plan-poi-focus") ?? 0}
									/>
								}
							/>
						) : null}

						{scheduleSelectionOverlay != null ? (
							<ReferenceDot
								x={scheduleSelectionOverlay.km}
								y={scheduleSelectionOverlay.ele}
								r={5}
								fill={PLAN_POI_MARKER_COLOR}
								stroke="#fff"
								strokeWidth={2}
							/>
						) : null}

						{/* 외부 제어 마커 */}
						{!chartInteractionDisabled && currentChartDatum != null && (
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
				{scheduleSelectionOverlay != null && scheduleTooltipStyle != null ? (
					<ScheduleSelectionKmEleTooltip
						km={scheduleSelectionOverlay.km}
						ele={scheduleSelectionOverlay.ele}
						compactTooltip={compactTooltip}
						style={{
							left: scheduleTooltipStyle.left,
							top: scheduleTooltipStyle.top,
							transform: scheduleTooltipStyle.transform,
						}}
					/>
				) : null}
				{/* 호버/핀 공용 툴팁 — 가로 배치는 elevationChartTooltipLineOffsetStyle 공통 */}
				{!chartInteractionDisabled &&
				currentChartDatum != null &&
				hoverTooltipPlacementStyle != null ? (
					<ElevationHoverTooltip
						datum={currentChartDatum}
						trackPoints={trackPoints}
						cpMarkers={cpMarkers}
						elevationCalibratedThreshold={elevationCalibratedThreshold}
						cpAnchorMinKm={tooltipCpAnchorKm}
						cpAnchorMaxKm={tooltipCpAnchorMaxKm}
						anchorFallbackDayNumber={tooltipAnchorDayNumber}
						compactTooltip={compactTooltip}
						pinned={isPinned}
						placementStyle={hoverTooltipPlacementStyle}
						onUnpin={onUnpin}
					/>
				) : null}
				{/* 경계 드래그 핸들 + 미리보기 툴팁 (차트 위 오버레이) */}
				{canDragBoundary && selectedStage && stageEndBoundaryHitLeftPct != null && (
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
							onMouseEnter={() => setIsHoveringStageEndBoundary(true)}
							onMouseLeave={() => setIsHoveringStageEndBoundary(false)}
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
									setStageEndBoundaryMenuAnchor(null);
									return;
								}
								const root = chartContainerRef.current;
								if (!root) return;
								const r = root.getBoundingClientRect();
								setStageEndBoundaryMenuAnchor({
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
										onClick={() => setStageEndBoundaryMenuAnchor(null)}
									>
										취소
									</button>
									<button
										type="button"
										className="rounded bg-orange-500 px-2 py-1 font-medium text-white hover:bg-orange-600"
										onClick={() => {
											onStartBoundaryDrag?.(selectedStage.id, selectedStage.endDistanceKm);
											onStageEndBoundaryEditMapCenter?.(boundaryKmForHandle);
											setStageEndBoundaryMenuAnchor(null);
										}}
									>
										수정
									</button>
								</div>
							</div>
						) : null}
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
