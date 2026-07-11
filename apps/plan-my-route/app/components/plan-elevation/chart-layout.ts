export type ChartMarginBox = { top: number; right: number; left: number; bottom: number };

/** `tightChartMargin` 미사용 시 AreaChart·스케줄 툴팁 앵커 계산에 동일하게 사용 */
export const DEFAULT_AREA_CHART_MARGIN: ChartMarginBox = {
	top: 20,
	right: 8,
	left: 0,
	bottom: 4,
};

/** 스테이지 종료 경계 호버 히트 폭 (세로 점선 기준 좌우) */
export const STAGE_END_BOUNDARY_HIT_STRIP_PX = 24;
/** 종료 지점 단축 메뉴 대략 폭·높이(뷰포트 클램프용) */
export const STAGE_END_BOUNDARY_MENU_W_PX = 232;
/** 메뉴 오른쪽 끝과 클릭 앵커 사이 간격(앵커는 커서 쪽, 메뉴는 왼편으로 펼침) */
export const STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX = 8;
/** 종료 지점 변경 모드: X축 가시 구간 반폭(km) — 중앙에 경계, 좌우 각 5km */
export const CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM = 5;

/** 세로 마커(현재 위치)와 툴팁 사이 고정 간격(px) — 좌·우 배치 동일 */
export const ELEVATION_CHART_TOOLTIP_LINE_GAP_PX = 12;
/** CP·서밋 라벨 밴드(margin.top) 아래 호버 툴팁 여백 */
export const ELEVATION_HOVER_TOOLTIP_TOP_BELOW_LABEL_BAND_PX = 6;

/** AreaChart margin + YAxis width와 동일하게, 플롯 X 구간에 맞춘 앵커(px) */
export function elevationYAxisReservedWidth(tightFixedHeightChart: boolean, compactYAxis: boolean): number {
	return tightFixedHeightChart ? 36 : compactYAxis ? 40 : 38;
}

export type ChartPlotBox = { plotLeft: number; plotW: number };

export function getChartPlotBox(
	chartBoxWidth: number,
	margin: ChartMarginBox,
	yAxisWidth: number,
): ChartPlotBox {
	const plotLeft = margin.left + yAxisWidth;
	const plotRight = chartBoxWidth - margin.right;
	const plotW = Math.max(1, plotRight - plotLeft);
	return { plotLeft, plotW };
}

/** km → 플롯 X(px). Recharts 호버 좌표 없을 때(맵 연동 등) 폴백 */
export function elevationChartAnchorXFromKm(params: {
	km: number;
	visibleStart: number;
	visibleEnd: number;
	chartBoxWidth: number;
	margin: ChartMarginBox;
	yAxisWidth: number;
}): number {
	const { km, visibleStart, visibleEnd, chartBoxWidth, margin, yAxisWidth } = params;
	const span = visibleEnd - visibleStart;
	const { plotLeft, plotW } = getChartPlotBox(chartBoxWidth, margin, yAxisWidth);
	const t = span > 0 ? (km - visibleStart) / span : 0.5;
	return plotLeft + t * plotW;
}

/** Recharts activeCoordinate.x → chartContainerRef 기준 px */
export function chartOverlayXFromRechartsCoordinate(
	coordinateX: number,
	chartContainer: HTMLElement | null,
): number {
	if (!chartContainer) return coordinateX;
	const wrapper = chartContainer.querySelector(".recharts-wrapper");
	if (!wrapper) return coordinateX;
	const offset =
		wrapper.getBoundingClientRect().left - chartContainer.getBoundingClientRect().left;
	return coordinateX + offset;
}

/** Recharts 플롯과 동일한 X 앵커(px) + 세로선과 겹치지 않는 translateX — 스케줄·핀 오버레이 공통 */
export type ElevationChartTooltipLineOffsetStyle = {
	left: number;
	translateX: string;
};

export function elevationChartTooltipPlacementFromAnchorX(
	anchorX: number,
	plotLeft: number,
	plotW: number,
): ElevationChartTooltipLineOffsetStyle {
	const placeTooltipRightOfLine = anchorX < plotLeft + plotW / 2;
	const gap = ELEVATION_CHART_TOOLTIP_LINE_GAP_PX;
	const translateX = placeTooltipRightOfLine
		? `translateX(${gap}px)`
		: `translateX(calc(-100% - ${gap}px))`;
	return { left: anchorX, translateX };
}

export function elevationChartTooltipLineOffsetStyle(params: {
	km: number;
	visibleStart: number;
	visibleEnd: number;
	chartBoxWidth: number;
	margin: ChartMarginBox;
	yAxisWidth: number;
}): ElevationChartTooltipLineOffsetStyle {
	const { chartBoxWidth, margin, yAxisWidth } = params;
	const anchorX = elevationChartAnchorXFromKm(params);
	const { plotLeft, plotW } = getChartPlotBox(chartBoxWidth, margin, yAxisWidth);
	return elevationChartTooltipPlacementFromAnchorX(anchorX, plotLeft, plotW);
}

/**
 * 스케줄 선택 km·고도 오버레이: 가로는 elevationChartTooltipLineOffsetStyle, 세로는 플롯 중앙.
 */
export function scheduleSelectionTooltipPlotStyle(params: {
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

export function nearestChartRowEleByKm(
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

export const GRADIENT_STRIP_HEIGHT = 8;
export const GRADIENT_STRIP_TOP_GAP = 1;
export const GRADIENT_STRIP_BOTTOM_MARGIN = GRADIENT_STRIP_TOP_GAP + GRADIENT_STRIP_HEIGHT + 14;
