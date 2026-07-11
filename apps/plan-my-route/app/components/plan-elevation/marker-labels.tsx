"use client";

import { MAP_VISUAL_PALETTE } from "@/app/constants/mapVisualPalette";
import { summitMarkerKey } from "@/lib/rwgps-plan-markers";
import type { CPOnRoute, ElevationScheduleMarkerFocus, SummitOnRoute } from "./types";

// ── CP 마커 라벨 (Recharts ReferenceLine label) ──────────────────
export const CP_COLOR = MAP_VISUAL_PALETTE.elevationCpStroke;
export const SUMMIT_COLOR = CP_COLOR;
export const CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE = 3;
/** stagger 레이아웃: 같은 row 인접 라벨의 기본 최소 허용 간격(px). 라벨 이름 폭이 작을 때의 하한. */
const LABEL_STAGGER_MIN_GAP_PX = 28;
/** 라벨 이름 글자 1개당 추정 폭(px). 한글 11px 폰트 기준. */
const LABEL_STAGGER_CHAR_WIDTH_PX = 11;
/** 인접 라벨 박스 사이 여백(px). */
const LABEL_STAGGER_GAP_PADDING_PX = 6;
/** row 한 칸당 수직 간격(px). font-size 11 + 여백. */
export const LABEL_STAGGER_ROW_HEIGHT_PX = 14;
/** 이 폭 미만이면 stagger 최대 3줄(row 0~2), 이상이면 최대 2줄(row 0~1). */
const LABEL_STAGGER_NARROW_CHART_WIDTH_PX = 400;

export type LabelRow = 0 | 1 | 2;

/** 차트 폭에 따른 stagger 최대 row (0-indexed). */
export function resolveLabelStaggerMaxRow(chartBoxWidth: number): LabelRow {
	if (chartBoxWidth > 0 && chartBoxWidth < LABEL_STAGGER_NARROW_CHART_WIDTH_PX) return 2;
	return 1;
}
export type LabelRowEntry = { key: string; distanceKm: number; halfWidthPx: number };
export type LabelRowResult = { rowByKey: Map<string, LabelRow>; maxRowUsed: LabelRow };

function estimateLabelHalfWidthPx(name: string): number {
	return (name.length * LABEL_STAGGER_CHAR_WIDTH_PX) / 2;
}

export function computeLabelRows(params: {
	enabled: boolean;
	maxRow: LabelRow;
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
		maxRow,
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
			? scheduleMarkerFocus?.kind === "summit" &&
					scheduleMarkerFocus.id === summit.id &&
					scheduleMarkerFocus.passIndex === summit.passIndex
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
				key: summitMarkerKey(summit),
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
	const lastByRow: Array<RowLast | null> = new Array(maxRow + 1).fill(null);

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
			for (let step = 1; step <= maxRow; step++) {
				const r = ((lastChosenRow + step) % (maxRow + 1)) as LabelRow;
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
			for (let r = 1; r <= maxRow; r++) {
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

export function CPMarkerLabel({
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

export function SummitMarkerLabel({
	viewBox,
	showName,
	name,
	row = 0,
	onClick,
}: {
	viewBox?: { x?: number; y?: number };
	showName: boolean;
	name: string;
	row?: LabelRow;
	onClick?: () => void;
}) {
	if (viewBox?.x == null || viewBox?.y == null) return null;
	const { x, y } = viewBox;
	const triW = 4;
	const triH = 6;
	const labelY = y - 4 - row * LABEL_STAGGER_ROW_HEIGHT_PX;
	const hitPad = 10;
	// labelY는 row=0이면 y-4, row>0이면 더 위. 텍스트 상단까지 히트 영역 확장
	const hitTop = showName ? labelY - 12 : y - hitPad;
	const hitHeight = showName ? (y + triH + hitPad) - hitTop : triH + hitPad * 2;
	return (
		<g
			onMouseDown={
				onClick
					? (e) => {
							e.stopPropagation();
							onClick();
						}
					: undefined
			}
			style={onClick ? { cursor: "pointer" } : undefined}
		>
			{/* 클릭 히트 영역 (텍스트+삼각형 전체 커버) */}
			{onClick && (
				<rect
					x={x - Math.max(triW + hitPad, 30)}
					y={hitTop}
					width={Math.max(triW + hitPad, 30) * 2}
					height={hitHeight}
					fill="transparent"
				/>
			)}
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

export const PLAN_POI_MARKER_COLOR = "#2563eb";

export function PlanPoiMarkerLabel({
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

