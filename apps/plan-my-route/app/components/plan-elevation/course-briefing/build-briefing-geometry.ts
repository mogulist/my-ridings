import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { Stage } from "@/app/types/plan";
import { computeSegmentGainBetweenKm } from "../elevation-gain";
import type { SummitOnRoute } from "../types";

export const BRIEFING_VIEW_WIDTH = 1920;
export const BRIEFING_VIEW_HEIGHT = 1080;
export const BRIEFING_BACKGROUND = "#0B1220";

const CHART_LEFT = 120;
const CHART_RIGHT = 1800;
const CHART_TOP = 520;
const CHART_BOTTOM = 900;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

/** 브리핑 전용: 최고봉 위·라벨 밴드 여유 (라벨·가이드선 간격 확보) */
const BRIEFING_ELE_PADDING_TOP_RATIO = 0.22;
const BRIEFING_SUMMIT_LABEL_BASE_OFFSET = 52;
const BRIEFING_SUMMIT_ELEVATION_OFFSET = 32;
const BRIEFING_ELEVATION_DESCENT_PX = 22 * 0.32;
const BRIEFING_LEADER_GAP_PX = 12;
const BRIEFING_LEADER_MIN_LINE_PX = 10;

type TrackPointWithElevation = TrackPoint & { e: number; d: number };

export type BriefingSummitPoint = {
	key: string;
	name: string;
	elevation: number;
	distanceKm: number;
	x: number;
	y: number;
	labelRow: number;
};

export type BriefingGeometry = {
	viewWidth: number;
	viewHeight: number;
	chartLeft: number;
	chartTop: number;
	chartWidth: number;
	chartHeight: number;
	areaPath: string;
	linePath: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	startElevation: number;
	endElevation: number;
	startName: string;
	endName: string;
	totalDistanceKm: number;
	elevationGainM: number;
	summits: BriefingSummitPoint[];
	/** 최고 서밋이 라벨에 너무 가까울 때 라벨 밴드를 위로 올리는 px */
	summitLabelUpliftPx: number;
};

export type BriefingRange = {
	startKm: number;
	endKm: number;
	startName: string;
	endName: string;
};

export function resolveBriefingRange(
	stages: Stage[],
	selectedDayNumber: number | null,
	totalKm: number,
): BriefingRange {
	if (selectedDayNumber != null && stages.length > 0) {
		const stage = stages.find((s) => s.dayNumber === selectedDayNumber);
		if (stage) {
			return {
				startKm: stage.startDistanceKm,
				endKm: stage.endDistanceKm,
				startName: stage.startName?.trim() || "Start",
				endName: stage.endName?.trim() || "Finish",
			};
		}
	}

	const first = stages[0];
	const last = stages[stages.length - 1];

	return {
		startKm: 0,
		endKm: totalKm,
		startName: first?.startName?.trim() || "Start",
		endName: last?.endName?.trim() || "Finish",
	};
}

function collectPointsInRange(
	points: TrackPoint[],
	startKm: number,
	endKm: number,
): TrackPointWithElevation[] {
	const withEle = points.filter(
		(p): p is TrackPointWithElevation => p.e != null && p.d != null,
	);
	if (withEle.length === 0) return [];

	const result: TrackPointWithElevation[] = [];
	for (const point of withEle) {
		const km = point.d / 1000;
		if (km < startKm) continue;
		if (km > endKm) break;
		result.push(point);
	}

	if (result.length === 0) {
		const startPoint = elevationAtKmPoint(withEle, startKm);
		const endPoint = elevationAtKmPoint(withEle, endKm);
		if (startPoint) result.push(startPoint);
		if (endPoint && endPoint !== startPoint) result.push(endPoint);
	}

	return result;
}

function elevationAtKmPoint(
	points: TrackPointWithElevation[],
	km: number,
): TrackPointWithElevation | null {
	if (points.length === 0) return null;
	const idx = points.findIndex((p) => p.d / 1000 >= km);
	if (idx === -1) return points[points.length - 1];
	if (idx === 0) return points[0];

	const prev = points[idx - 1];
	const next = points[idx];
	const prevKm = prev.d / 1000;
	const nextKm = next.d / 1000;
	if (nextKm <= prevKm) return prev;

	const ratio = (km - prevKm) / (nextKm - prevKm);
	const e = prev.e + (next.e - prev.e) * ratio;
	return { ...next, d: km * 1000, e };
}

function kmToChartX(km: number, startKm: number, endKm: number): number {
	if (endKm <= startKm) return CHART_LEFT;
	const ratio = (km - startKm) / (endKm - startKm);
	return CHART_LEFT + ratio * CHART_WIDTH;
}

function eleToChartY(ele: number, minEle: number, maxEle: number): number {
	const span = maxEle - minEle;
	const paddedMin = minEle - span * 0.08;
	const paddedMax = maxEle + span * BRIEFING_ELE_PADDING_TOP_RATIO;
	const paddedSpan = paddedMax - paddedMin;
	if (paddedSpan <= 0) return CHART_TOP + CHART_HEIGHT / 2;
	const ratio = (ele - paddedMin) / paddedSpan;
	return CHART_BOTTOM - ratio * CHART_HEIGHT;
}

function buildPathD(
	points: Array<{ x: number; y: number }>,
	closeToBottom: boolean,
): string {
	if (points.length === 0) return "";

	const segments = points.map((p, i) => {
		const cmd = i === 0 ? "M" : "L";
		return `${cmd} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
	});

	if (!closeToBottom) return segments.join(" ");

	const last = points[points.length - 1];
	const first = points[0];
	return `${segments.join(" ")} L ${last.x.toFixed(1)} ${CHART_BOTTOM} L ${first.x.toFixed(1)} ${CHART_BOTTOM} Z`;
}

function estimateSummitLabelHalfWidthPx(name: string): number {
	return name.length * 16 + 12;
}

function assignSummitLabelRows(
	summits: Array<{ x: number; halfWidthPx: number; key: string }>,
): Map<string, number> {
	const sorted = [...summits].sort((a, b) => a.x - b.x);
	const rowByKey = new Map<string, number>();
	const rowEnds: number[] = [];
	const minGapPx = 28;

	for (const summit of sorted) {
		let row = 0;
		while (row < rowEnds.length) {
			if (summit.x - summit.halfWidthPx >= rowEnds[row] + minGapPx) break;
			row += 1;
		}
		rowByKey.set(summit.key, row);
		const rightEdge = summit.x + summit.halfWidthPx;
		if (row >= rowEnds.length) rowEnds.push(rightEdge);
		else rowEnds[row] = Math.max(rowEnds[row], rightEdge);
	}

	return rowByKey;
}

export function buildBriefingGeometry(params: {
	trackPoints: TrackPoint[];
	summitMarkers: SummitOnRoute[];
	stages: Stage[];
	selectedDayNumber: number | null;
	totalKm: number;
	elevationCalibratedThreshold?: number;
}): BriefingGeometry | null {
	const {
		trackPoints,
		summitMarkers,
		stages,
		selectedDayNumber,
		totalKm,
		elevationCalibratedThreshold,
	} = params;
	const range = resolveBriefingRange(stages, selectedDayNumber, totalKm);
	const { startKm, endKm, startName, endName } = range;

	if (endKm <= startKm || totalKm <= 0) return null;

	const segmentPoints = collectPointsInRange(trackPoints, startKm, endKm);
	if (segmentPoints.length < 2) return null;

	const chartPoints = segmentPoints.map((p) => ({
		km: p.d / 1000,
		ele: p.e,
	}));

	const minEle = Math.min(...chartPoints.map((p) => p.ele));
	const maxEle = Math.max(...chartPoints.map((p) => p.ele));

	const normalized = chartPoints.map((p) => ({
		x: kmToChartX(p.km, startKm, endKm),
		y: eleToChartY(p.ele, minEle, maxEle),
	}));

	const startElevation = chartPoints[0].ele;
	const endElevation = chartPoints[chartPoints.length - 1].ele;
	const startX = normalized[0].x;
	const startY = normalized[0].y;
	const endX = normalized[normalized.length - 1].x;
	const endY = normalized[normalized.length - 1].y;

	const visibleSummits = summitMarkers
		.filter((s) => s.distanceKm >= startKm && s.distanceKm <= endKm)
		.sort((a, b) => a.distanceKm - b.distanceKm);

	const summitLabelInputs = visibleSummits.map((summit) => ({
		key: `${summit.id}:${summit.passIndex}`,
		x: kmToChartX(summit.distanceKm, startKm, endKm),
		halfWidthPx: estimateSummitLabelHalfWidthPx(summit.name),
	}));

	const labelRows = assignSummitLabelRows(summitLabelInputs);

	const summits: BriefingSummitPoint[] = visibleSummits.map((summit) => {
		const key = `${summit.id}:${summit.passIndex}`;
		const x = kmToChartX(summit.distanceKm, startKm, endKm);
		const y = eleToChartY(summit.elevation, minEle, maxEle);
		return {
			key,
			name: summit.name,
			elevation: summit.elevation,
			distanceKm: summit.distanceKm,
			x,
			y,
			labelRow: labelRows.get(key) ?? 0,
		};
	});

	const row0LabelBottomY =
		CHART_TOP -
		BRIEFING_SUMMIT_LABEL_BASE_OFFSET +
		BRIEFING_SUMMIT_ELEVATION_OFFSET +
		BRIEFING_ELEVATION_DESCENT_PX;
	const leaderClearancePx =
		BRIEFING_LEADER_GAP_PX * 2 + BRIEFING_LEADER_MIN_LINE_PX;
	let summitLabelUpliftPx = 0;
	if (summits.length > 0) {
		const minSummitY = Math.min(...summits.map((s) => s.y));
		const neededPeakY = row0LabelBottomY + leaderClearancePx;
		if (minSummitY < neededPeakY) {
			summitLabelUpliftPx = neededPeakY - minSummitY;
		}
	}

	return {
		viewWidth: BRIEFING_VIEW_WIDTH,
		viewHeight: BRIEFING_VIEW_HEIGHT,
		chartLeft: CHART_LEFT,
		chartTop: CHART_TOP,
		chartWidth: CHART_WIDTH,
		chartHeight: CHART_HEIGHT,
		areaPath: buildPathD(normalized, true),
		linePath: buildPathD(normalized, false),
		startX,
		startY,
		endX,
		endY,
		startElevation,
		endElevation,
		startName,
		endName,
		totalDistanceKm: endKm - startKm,
		elevationGainM: computeSegmentGainBetweenKm(
			trackPoints,
			startKm,
			endKm,
			elevationCalibratedThreshold,
		),
		summits,
		summitLabelUpliftPx,
	};
}
