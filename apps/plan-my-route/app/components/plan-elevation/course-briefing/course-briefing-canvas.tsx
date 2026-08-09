"use client";

import type { BriefingGeometry } from "./build-briefing-geometry";
import { BRIEFING_BACKGROUND } from "./build-briefing-geometry";

/** K-Fondo 브랜드 emerald-500 — 프로필 fill/line */
const PROFILE_FILL = "#10b981";
const GREY_FILL = "rgba(255, 255, 255, 0.14)";
const GREY_LINE = "rgba(255, 255, 255, 0.35)";
const SUMMIT_LABEL_ROW_OFFSET = 64;
const SUMMIT_LABEL_BASE_OFFSET = 52;
const START_FINISH_LABEL_OFFSET = 280;
/** X축 끝: 숫자(왼쪽) · 단위(오른쪽) 사이 여백 */
const DISTANCE_LABEL_AXIS_GAP = 8;
/** 세로 가이드선 — 라벨 하단·고점과 선 사이 동일 여백 */
const LEADER_SYMMETRIC_GAP = 12;
const LEADER_MIN_LINE_LENGTH = 10;
/** 고도 텍스트 baseline 아래 글자 descent (과대 추정하면 선 위 여백만 커짐) */
const ELEVATION_LABEL_DESCENT_RATIO = 0.32;
const SUMMIT_NAME_FONT_SIZE = 28;
const SUMMIT_ELEVATION_FONT_SIZE = 22;
const SUMMIT_ELEVATION_OFFSET = 32;
/** Start/Finish 지명 · X축 거리(0, km 숫자·단위) 공통 크기 */
const MAJOR_LABEL_FONT_SIZE = 36;
const START_FINISH_NAME_FONT_SIZE = MAJOR_LABEL_FONT_SIZE;
const AXIS_DISTANCE_FONT_SIZE = MAJOR_LABEL_FONT_SIZE;
const START_FINISH_ELEVATION_OFFSET = 52;
const START_FINISH_ELEVATION_FONT_SIZE = 36;

function computeEqualGapLeaderLineYs(
	labelBottomY: number,
	peakY: number,
): { startY: number; endY: number } | null {
	const span = peakY - labelBottomY;
	if (span < LEADER_MIN_LINE_LENGTH + 4) return null;

	const startY = labelBottomY + LEADER_SYMMETRIC_GAP;
	const endY = peakY - LEADER_SYMMETRIC_GAP;

	if (endY - startY < LEADER_MIN_LINE_LENGTH) {
		const centeredGap = (span - LEADER_MIN_LINE_LENGTH) / 2;
		if (centeredGap < 2) return null;
		return {
			startY: labelBottomY + centeredGap,
			endY: peakY - centeredGap,
		};
	}

	return { startY, endY };
}

type CourseBriefingCanvasProps = {
	geometry: BriefingGeometry;
	progress: number;
};

export function CourseBriefingCanvas({ geometry, progress }: CourseBriefingCanvasProps) {
	const clipWidth = geometry.chartWidth * progress;
	const gainLabel = `획득 고도 : ${geometry.elevationGainM.toLocaleString("ko-KR")} m`;
	const distanceKm = Math.round(geometry.totalDistanceKm);
	const axisEndX = geometry.chartLeft + geometry.chartWidth;
	const distanceLabelY = geometry.chartTop + geometry.chartHeight + 48;

	return (
		<svg
			viewBox={`0 0 ${geometry.viewWidth} ${geometry.viewHeight}`}
			className="h-full w-full"
			aria-hidden
		>
			<rect width={geometry.viewWidth} height={geometry.viewHeight} fill={BRIEFING_BACKGROUND} />

			<defs>
				<clipPath id="course-briefing-progress-clip">
					<rect
						x={geometry.chartLeft}
						y={0}
						width={clipWidth}
						height={geometry.viewHeight}
					/>
				</clipPath>
			</defs>

			<StartFinishLabel
				side="start"
				name={geometry.startName}
				elevation={geometry.startElevation}
				x={geometry.startX}
				y={geometry.startY}
				chartTop={geometry.chartTop}
			/>
			<StartFinishLabel
				side="finish"
				name={geometry.endName}
				elevation={geometry.endElevation}
				x={geometry.endX}
				y={geometry.endY}
				chartTop={geometry.chartTop}
			/>

			{geometry.summits.map((summit) => (
				<SummitLabel
					key={summit.key}
					summit={summit}
					chartTop={geometry.chartTop}
					labelUpliftPx={geometry.summitLabelUpliftPx}
				/>
			))}

			<path d={geometry.areaPath} fill={GREY_FILL} />
			<path d={geometry.linePath} fill="none" stroke={GREY_LINE} strokeWidth={3} />

			<g clipPath="url(#course-briefing-progress-clip)">
				<path d={geometry.areaPath} fill={PROFILE_FILL} />
				<path
					d={geometry.linePath}
					fill="none"
					stroke={PROFILE_FILL}
					strokeWidth={3}
					strokeLinejoin="round"
				/>
			</g>

			<line
				x1={geometry.chartLeft}
				y1={geometry.chartTop + geometry.chartHeight}
				x2={geometry.chartLeft + geometry.chartWidth}
				y2={geometry.chartTop + geometry.chartHeight}
				stroke="rgba(255,255,255,0.5)"
				strokeWidth={2}
			/>

			<text
				x={geometry.chartLeft}
				y={geometry.chartTop + geometry.chartHeight + 48}
				fill="white"
				fontSize={AXIS_DISTANCE_FONT_SIZE}
				fontWeight={700}
				fontFamily="system-ui, sans-serif"
			>
				0
			</text>
			<text
				x={axisEndX - DISTANCE_LABEL_AXIS_GAP}
				y={distanceLabelY}
				fill="white"
				fontSize={AXIS_DISTANCE_FONT_SIZE}
				fontWeight={800}
				textAnchor="end"
				fontFamily="system-ui, sans-serif"
			>
				{distanceKm.toLocaleString("ko-KR")}
			</text>
			<text
				x={axisEndX + DISTANCE_LABEL_AXIS_GAP}
				y={distanceLabelY}
				fill="white"
				fontSize={AXIS_DISTANCE_FONT_SIZE}
				fontWeight={800}
				textAnchor="start"
				fontFamily="system-ui, sans-serif"
			>
				km
			</text>
			<text
				x={geometry.chartLeft + geometry.chartWidth / 2}
				y={distanceLabelY}
				fill="white"
				fontSize={32}
				fontWeight={600}
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
			>
				{gainLabel}
			</text>
		</svg>
	);
}

type StartFinishLabelProps = {
	side: "start" | "finish";
	name: string;
	elevation: number;
	x: number;
	y: number;
	chartTop: number;
};

function StartFinishLabel({ side, name, elevation, x, y, chartTop }: StartFinishLabelProps) {
	const labelY = chartTop - START_FINISH_LABEL_OFFSET;
	const textAnchor = side === "finish" ? "end" : "start";
	const labelX = side === "finish" ? x + 40 : x - 40;
	const labelBottomY =
		labelY +
		START_FINISH_ELEVATION_OFFSET +
		START_FINISH_ELEVATION_FONT_SIZE * ELEVATION_LABEL_DESCENT_RATIO;
	const leader = computeEqualGapLeaderLineYs(labelBottomY, y);

	return (
		<g>
			{leader ? (
				<line
					x1={x}
					y1={leader.startY}
					x2={x}
					y2={leader.endY}
					stroke="rgba(255,255,255,0.55)"
					strokeWidth={2}
					strokeDasharray="6 6"
				/>
			) : null}
			<text
				x={labelX}
				y={labelY}
				fill="white"
				fontSize={START_FINISH_NAME_FONT_SIZE}
				fontWeight={800}
				textAnchor={textAnchor}
				fontFamily="system-ui, sans-serif"
			>
				{name}
			</text>
			<text
				x={labelX}
				y={labelY + START_FINISH_ELEVATION_OFFSET}
				fill="rgba(255,255,255,0.9)"
				fontSize={START_FINISH_ELEVATION_FONT_SIZE}
				fontWeight={600}
				textAnchor={textAnchor}
				fontFamily="system-ui, sans-serif"
			>
				{Math.round(elevation).toLocaleString("ko-KR")} m
			</text>
		</g>
	);
}

type SummitLabelProps = {
	summit: BriefingGeometry["summits"][number];
	chartTop: number;
	labelUpliftPx: number;
};

function SummitLabel({ summit, chartTop, labelUpliftPx }: SummitLabelProps) {
	const labelY =
		chartTop -
		SUMMIT_LABEL_BASE_OFFSET -
		summit.labelRow * SUMMIT_LABEL_ROW_OFFSET -
		labelUpliftPx;
	const elevationText = `${Math.round(summit.elevation).toLocaleString("ko-KR")} m`;
	const labelBottomY =
		labelY +
		SUMMIT_ELEVATION_OFFSET +
		SUMMIT_ELEVATION_FONT_SIZE * ELEVATION_LABEL_DESCENT_RATIO;
	const leader = computeEqualGapLeaderLineYs(labelBottomY, summit.y);

	return (
		<g>
			{leader ? (
				<line
					x1={summit.x}
					y1={leader.startY}
					x2={summit.x}
					y2={leader.endY}
					stroke="rgba(255,255,255,0.45)"
					strokeWidth={2}
				/>
			) : null}
			<text
				x={summit.x}
				y={labelY}
				fill="white"
				fontSize={SUMMIT_NAME_FONT_SIZE}
				fontWeight={700}
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
			>
				{summit.name}
			</text>
			<text
				x={summit.x}
				y={labelY + SUMMIT_ELEVATION_OFFSET}
				fill="rgba(255,255,255,0.85)"
				fontSize={SUMMIT_ELEVATION_FONT_SIZE}
				fontWeight={500}
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
			>
				{elevationText}
			</text>
		</g>
	);
}
