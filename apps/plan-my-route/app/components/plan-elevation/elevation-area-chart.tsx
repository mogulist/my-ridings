"use client";

import { formatDistanceAxis, GradientStrip } from "@my-ridings/elevation-profile";
import type { ClimbProfile, GradientSegment } from "@my-ridings/plan-geometry";
import type { ClimbStartMode } from "@my-ridings/plan-geometry";
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
import { getStageColor, UNPLANNED_COLOR } from "@/app/types/plan";
import type { Stage } from "@/app/types/plan";
import type { ChartDatum } from "@/lib/enrich-chart-data";
import { summitMarkerKey } from "@/lib/rwgps-plan-markers";
import {
	elevationYAxisReservedWidth,
	GRADIENT_STRIP_HEIGHT,
	GRADIENT_STRIP_TOP_GAP,
	type ChartMarginBox,
} from "./chart-layout";
import {
	CPMarkerLabel,
	CP_COLOR,
	PLAN_POI_MARKER_COLOR,
	PlanPoiMarkerLabel,
	SUMMIT_COLOR,
	SummitMarkerLabel,
	type LabelRow,
} from "./marker-labels";
import type { CPOnRoute, ElevationScheduleMarkerFocus, SummitOnRoute } from "./types";

export type ElevationAreaChartProps = {
	chartHeightPx?: number;
	chartData: ChartDatum[] | Record<string, number | undefined>[];
	effectiveChartMargin: ChartMarginBox;
	chartInteractionDisabled: boolean;
	handleMouseMove?: (state: {
		activeTooltipIndex?: number | string | null;
		activeCoordinate?: { x?: number; y?: number };
	}) => void;
	handleMouseLeave?: () => void;
	handleChartClick?: () => void;
	stages: Stage[];
	activeStageId?: string | null;
	hasStages: boolean;
	stageKeys: string[];
	selectedDayNumber: number | null;
	visibleStart: number;
	visibleEnd: number;
	climbProfile: ClimbProfile | null;
	climbGradientFillStops: { offset: number; color: string }[] | null;
	showGradientStrip: boolean;
	gradientSegments: GradientSegment[];
	tightFixedHeightChart: boolean;
	compactYAxis: boolean;
	stageBoundaries: { distanceKm: number; stageId: string; label: string }[];
	isHoveringStageEndBoundary: boolean;
	selectedStage: Stage | null;
	pendingStageEdit: { stageId: string; originalEndKm: number; previewEndKm: number } | null;
	pendingStage: Stage | null;
	visibleCPs: CPOnRoute[];
	visibleSummits: SummitOnRoute[];
	cpNameVisible: (cp: CPOnRoute) => boolean;
	summitNameVisible: (summit: SummitOnRoute) => boolean;
	labelRowByKey: Map<string, LabelRow>;
	planPoiFocusInView: boolean;
	scheduleMarkerFocus: ElevationScheduleMarkerFocus | null;
	scheduleSelectionOverlay: { km: number; ele: number } | null;
	currentChartDatum: ChartDatum | null;
	effectiveClimbZoomSummitKey: string | null;
	handleSummitClick: (key: string) => void;
};

export function ElevationAreaChart({
	chartHeightPx,
	chartData,
	effectiveChartMargin,
	chartInteractionDisabled,
	handleMouseMove,
	handleMouseLeave,
	handleChartClick,
	stages,
	activeStageId,
	hasStages,
	stageKeys,
	selectedDayNumber,
	visibleStart,
	visibleEnd,
	climbProfile,
	climbGradientFillStops,
	showGradientStrip,
	gradientSegments,
	tightFixedHeightChart,
	compactYAxis,
	stageBoundaries,
	isHoveringStageEndBoundary,
	selectedStage,
	pendingStageEdit,
	pendingStage,
	visibleCPs,
	visibleSummits,
	cpNameVisible,
	summitNameVisible,
	labelRowByKey,
	planPoiFocusInView,
	scheduleMarkerFocus,
	scheduleSelectionOverlay,
	currentChartDatum,
	effectiveClimbZoomSummitKey,
	handleSummitClick,
}: ElevationAreaChartProps) {
	return (
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
							{/* 클라임 줌: 경사도별 수평 컬러 그라디언트 */}
							{climbGradientFillStops && (
								<linearGradient
									id="climbGradientFill"
									x1="0"
									y1="0"
									x2="1"
									y2="0"
									gradientUnits="objectBoundingBox"
								>
									{climbGradientFillStops.map((stop, i) => (
										<stop
											key={i}
											offset={stop.offset}
											stopColor={stop.color}
											stopOpacity={0.88}
										/>
									))}
								</linearGradient>
							)}
						</defs>

						<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />

						<XAxis
							dataKey="distanceKm"
							type="number"
							domain={
								selectedDayNumber != null || climbProfile != null
									? [visibleStart, visibleEnd]
									: ["dataMin", "dataMax"]
							}
							tickFormatter={(v: number) =>
								formatDistanceAxis(Math.round(v * 10) / 10)
							}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							tickMargin={
								showGradientStrip
									? GRADIENT_STRIP_TOP_GAP + GRADIENT_STRIP_HEIGHT + 5
									: tightFixedHeightChart
										? 2
										: 6
							}
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
								fill={
									climbProfile && climbGradientFillStops
										? "url(#climbGradientFill)"
										: "url(#eleGradient)"
								}
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
										fill={
											climbProfile && climbGradientFillStops
												? "url(#climbGradientFill)"
												: `url(#stageGradient_${idx})`
										}
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
						{/* Summit 마커 */}
						{visibleSummits.map((summit) => {
							const markerKey = summitMarkerKey(summit);
							const isZoomed = effectiveClimbZoomSummitKey === markerKey;
							return (
							<ReferenceLine
								key={markerKey}
								x={summit.distanceKm}
								stroke={isZoomed ? "#f97316" : SUMMIT_COLOR}
								strokeWidth={isZoomed ? 1 : 0.5}
								strokeDasharray="2 3"
								label={
									<SummitMarkerLabel
										showName={summitNameVisible(summit)}
										name={summit.name}
										row={labelRowByKey.get(markerKey) ?? 0}
										onClick={
											!chartInteractionDisabled
												? () => handleSummitClick(markerKey)
												: undefined
										}
									/>
								}
							/>
							);
						})}
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
					{showGradientStrip && (
						<GradientStrip
							segments={gradientSegments}
							topGap={GRADIENT_STRIP_TOP_GAP}
						/>
					)}
					</AreaChart>

		</ResponsiveContainer>
	);
}
