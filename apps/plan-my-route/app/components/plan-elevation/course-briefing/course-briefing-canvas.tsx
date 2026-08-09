"use client";

import type { BriefingGeometry } from "./build-briefing-geometry";
import { BRIEFING_BACKGROUND } from "./build-briefing-geometry";

const YELLOW_FILL = "#F5D000";
const GREY_FILL = "rgba(255, 255, 255, 0.14)";
const GREY_LINE = "rgba(255, 255, 255, 0.35)";
const SUMMIT_LABEL_ROW_OFFSET = 64;
const SUMMIT_LABEL_BASE_OFFSET = 52;
const START_FINISH_LABEL_OFFSET = 280;

type CourseBriefingCanvasProps = {
	geometry: BriefingGeometry;
	progress: number;
};

export function CourseBriefingCanvas({ geometry, progress }: CourseBriefingCanvasProps) {
	const clipWidth = geometry.chartWidth * progress;
	const gainLabel = `누적 상승 : ${geometry.elevationGainM.toLocaleString("ko-KR")} m`;
	const distanceLabel = `${Math.round(geometry.totalDistanceKm)} km`;

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
				<SummitLabel key={summit.key} summit={summit} chartTop={geometry.chartTop} />
			))}

			<path d={geometry.areaPath} fill={GREY_FILL} />
			<path d={geometry.linePath} fill="none" stroke={GREY_LINE} strokeWidth={3} />

			<g clipPath="url(#course-briefing-progress-clip)">
				<path d={geometry.areaPath} fill={YELLOW_FILL} />
				<path
					d={geometry.linePath}
					fill="none"
					stroke={YELLOW_FILL}
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
				fontSize={36}
				fontWeight={700}
				fontFamily="system-ui, sans-serif"
			>
				0
			</text>
			<text
				x={geometry.chartLeft + geometry.chartWidth}
				y={geometry.chartTop + geometry.chartHeight + 48}
				fill="white"
				fontSize={48}
				fontWeight={800}
				textAnchor="end"
				fontFamily="system-ui, sans-serif"
			>
				{distanceLabel}
			</text>
			<text
				x={geometry.chartLeft + geometry.chartWidth / 2}
				y={geometry.chartTop + geometry.chartHeight + 48}
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
	const leaderStartY = labelY + 96;

	return (
		<g>
			<line
				x1={x}
				y1={leaderStartY}
				x2={x}
				y2={y}
				stroke="rgba(255,255,255,0.55)"
				strokeWidth={2}
				strokeDasharray="6 6"
			/>
			<text
				x={labelX}
				y={labelY}
				fill="white"
				fontSize={52}
				fontWeight={800}
				textAnchor={textAnchor}
				fontFamily="system-ui, sans-serif"
			>
				{name}
			</text>
			<text
				x={labelX}
				y={labelY + 52}
				fill="rgba(255,255,255,0.9)"
				fontSize={36}
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
};

function SummitLabel({ summit, chartTop }: SummitLabelProps) {
	const labelY =
		chartTop - SUMMIT_LABEL_BASE_OFFSET - summit.labelRow * SUMMIT_LABEL_ROW_OFFSET;
	const elevationText = `${Math.round(summit.elevation).toLocaleString("ko-KR")} m`;

	return (
		<g>
			<line
				x1={summit.x}
				y1={labelY + 28}
				x2={summit.x}
				y2={summit.y}
				stroke="rgba(255,255,255,0.45)"
				strokeWidth={2}
			/>
			<text
				x={summit.x}
				y={labelY}
				fill="white"
				fontSize={28}
				fontWeight={700}
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
			>
				{summit.name}
			</text>
			<text
				x={summit.x}
				y={labelY + 32}
				fill="rgba(255,255,255,0.85)"
				fontSize={22}
				fontWeight={500}
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
			>
				{elevationText}
			</text>
		</g>
	);
}
