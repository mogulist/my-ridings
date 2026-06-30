"use client";

import type { GradientSegment } from "@my-ridings/plan-geometry";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TooltipContentProps } from "recharts";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceArea,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { GradientStrip } from "./components/GradientStrip";
import { MarkerOverlay } from "./components/MarkerOverlay";
import { SelectionOverlay } from "./components/SelectionOverlay";
import { useZoomState } from "./hooks/useZoomState";
import type { PauseSegment, ProfileMarker, ProfilePoint, XAxisMode } from "./types";
import {
	formatAbsoluteTimeAxis,
	formatAbsoluteTimeTooltip,
	formatDistanceAxis,
	formatRelativeTimeAxis,
	nearestProfilePoint,
	profilePointToXValue,
} from "./utils";

const YAXIS_W = 45;
const CHART_MARGIN_R = 10;
const LABEL_TIERS = 3;
const LABEL_ROW_HEIGHT = 13;
const LABEL_GAP_PX = 24;
const POI_TOP_MARGIN = LABEL_GAP_PX + LABEL_TIERS * LABEL_ROW_HEIGHT + 4;

const X_AXIS_MODE_LABELS: Record<XAxisMode, string> = {
	distance: "거리",
	"relative-time": "상대 시간",
	"absolute-time": "절대 시간",
};

function DefaultTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload as ProfilePoint;
	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
			<p className="font-semibold text-gray-800">고도 {Math.round(point.elevationM)} m</p>
			<p className="text-gray-500">거리 {point.distanceKm.toFixed(1)} km</p>
			{point.elapsedSeconds != null && (
				<p className="text-gray-500">경과 {formatRelativeTimeAxis(point.elapsedSeconds)}</p>
			)}
			{point.absoluteMs != null && (
				<p className="text-gray-500">{formatAbsoluteTimeTooltip(point.absoluteMs)}</p>
			)}
		</div>
	);
}

export type ElevationProfileProps = {
	data: ProfilePoint[];
	pauseSegments?: PauseSegment[];
	/** 경사도 색상 띠. 제공 시 거리 모드에서 x축 아래에 표시 */
	gradientSegments?: GradientSegment[];
	markers?: ProfileMarker[];
	/** x축 모드 전환 버튼에 표시할 모드 목록 */
	xAxisModes?: XAxisMode[];
	defaultXAxisMode?: XAxisMode;
	zoom?: boolean;
	height?: number;
	title?: string;
	className?: string;
	/** hover 중인 ProfilePoint 변경 콜백 */
	onHoverPoint?: (point: ProfilePoint | null) => void;
	/** 선택 구간 (distanceKm) 변경 콜백. 드래그로 선택 해제 시 null */
	onSelectionChange?: (range: { startKm: number; endKm: number } | null) => void;
	/** 우클릭 시 콜백. 앱이 컨텍스트 메뉴를 직접 렌더링할 수 있도록 */
	onContextMenu?: (point: ProfilePoint, clientX: number, clientY: number) => void;
	/** 선택 구간 통계 (선택 중일 때 헤더 영역에 표시) */
	selectionStats?: React.ReactNode;
};

export function ElevationProfile({
	data,
	pauseSegments = [],
	gradientSegments,
	markers = [],
	xAxisModes = ["distance", "relative-time", "absolute-time"],
	defaultXAxisMode = "distance",
	zoom = true,
	height = 280,
	title,
	className,
	onHoverPoint,
	onSelectionChange,
	onContextMenu,
	selectionStats,
}: ElevationProfileProps) {
	const [xAxisMode, setXAxisMode] = useState<XAxisMode>(defaultXAxisMode);
	const containerRef = useRef<HTMLDivElement>(null);
	const [suppressTooltip, setSuppressTooltip] = useState(false);

	const zoomState = useZoomState({
		data,
		xAxisMode,
		yAxisWidth: YAXIS_W,
		chartMarginRight: CHART_MARGIN_R,
		containerRef,
		onSelectionChange,
	});

	const {
		zoomDomain,
		selection,
		drag,
		clearSelection,
		handleMouseDown,
		setDraggingHandle,
		pointAtClientX,
	} = zoomState;

	// Y축 범위: 줌인 중이면 보이는 구간만 기준으로
	const visibleElevations = useMemo(() => {
		const filtered = zoomDomain
			? data.filter((p) => p.distanceKm >= zoomDomain.startKm && p.distanceKm <= zoomDomain.endKm)
			: data;
		return (filtered.length > 0 ? filtered : data).map((p) => p.elevationM);
	}, [data, zoomDomain]);

	const minAlt = Math.max(0, Math.min(...visibleElevations) - 20);
	const peakAlt = Math.max(...visibleElevations);
	const maxAlt = peakAlt + Math.max((peakAlt - minAlt) * 0.08, 10);

	// X축 도메인 (줌 상태 고려)
	const xDomain = useMemo<[number | string, number | string]>(() => {
		if (!zoomDomain) return ["dataMin", "dataMax"];
		const s = nearestProfilePoint(zoomDomain.startKm, data);
		const e = nearestProfilePoint(zoomDomain.endKm, data);
		if (!s || !e) return ["dataMin", "dataMax"];
		return [profilePointToXValue(s, xAxisMode), profilePointToXValue(e, xAxisMode)];
	}, [zoomDomain, data, xAxisMode]);

	const xDataKey: keyof ProfilePoint =
		xAxisMode === "distance"
			? "distanceKm"
			: xAxisMode === "relative-time"
				? "elapsedSeconds"
				: "absoluteMs";

	const xTickFormatter = (v: number) => {
		if (xAxisMode === "distance") return formatDistanceAxis(v);
		if (xAxisMode === "relative-time") return formatRelativeTimeAxis(v);
		return formatAbsoluteTimeAxis(v);
	};

	function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
		if (!onHoverPoint) return;
		const point = pointAtClientX(e.clientX);
		onHoverPoint(point ?? null);
	}

	function handleMouseLeave() {
		onHoverPoint?.(null);
	}

	function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		e.preventDefault();
		setSuppressTooltip(true);
		onContextMenu?.(point, e.clientX, e.clientY);
	}

	// onContextMenu로 넘어간 후 다음 click에서 tooltip 억제 해제
	useEffect(() => {
		if (!suppressTooltip) return;
		const restore = () => setSuppressTooltip(false);
		document.addEventListener("click", restore, { once: true });
		return () => document.removeEventListener("click", restore);
	}, [suppressTooltip]);

	const showGradientStrip = xAxisMode === "distance" && (gradientSegments?.length ?? 0) > 0;

	const bottomMargin = showGradientStrip ? 28 : 16;

	const fluidHeight = height == null;

	return (
		<div
			className={[
				fluidHeight ? "flex flex-col" : "",
				className ?? "bg-white rounded-lg shadow p-4 sm:p-6",
			]
				.filter(Boolean)
				.join(" ")}
		>
			{/* 헤더 */}
			{(title != null || xAxisModes.length > 1 || selection) && (
				<div className="flex items-center justify-between flex-wrap gap-3 mb-4 shrink-0">
					<div className="flex items-center gap-2 flex-wrap">
						{title != null && <h2 className="text-lg font-semibold text-gray-800">{title}</h2>}
						{selection && selectionStats}
						{selection && !selectionStats && (
							<button
								type="button"
								onClick={clearSelection}
								className="text-xs text-gray-400 hover:text-gray-600 underline"
							>
								선택 해제
							</button>
						)}
					</div>
					{xAxisModes.length > 1 && (
						<div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
							{xAxisModes.map((mode) => (
								<button
									key={mode}
									type="button"
									onClick={() => setXAxisMode(mode)}
									className={[
										"px-3 py-1.5 transition-colors",
										xAxisMode === mode
											? "bg-blue-600 text-white font-medium"
											: "bg-white text-gray-600 hover:bg-gray-50",
									].join(" ")}
								>
									{X_AXIS_MODE_LABELS[mode]}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* 차트 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: chart interaction div */}
			<div
				ref={containerRef}
				className={fluidHeight ? "flex-1 min-h-0" : undefined}
				onMouseDown={zoom ? handleMouseDown : undefined}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onContextMenu={onContextMenu ? handleContextMenu : undefined}
			>
				<ResponsiveContainer width="100%" height={fluidHeight ? "100%" : height}>
					<AreaChart
						data={data}
						margin={{ top: POI_TOP_MARGIN, right: CHART_MARGIN_R, left: 0, bottom: bottomMargin }}
					>
						<defs>
							<linearGradient id="ep-area-fill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
								<stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
						<XAxis
							dataKey={xDataKey}
							type="number"
							domain={xDomain}
							allowDataOverflow
							tickFormatter={xTickFormatter}
							tick={{ fill: "#9ca3af", fontSize: 10 }}
							tickLine={false}
							axisLine={false}
							tickCount={6}
						/>
						<YAxis
							domain={[minAlt, maxAlt]}
							allowDataOverflow
							tickFormatter={(v: number) => `${v}m`}
							tick={{ fill: "#9ca3af", fontSize: 10 }}
							tickLine={false}
							axisLine={false}
							width={YAXIS_W}
						/>
						<Tooltip content={DefaultTooltip} active={suppressTooltip ? false : undefined} />

						{/* 일시 정지 구간 음영 */}
						{pauseSegments.map((pause, i) => {
							const x1Val =
								xAxisMode === "distance"
									? pause.distanceKmStart
									: xAxisMode === "relative-time"
										? pause.elapsedSecondsStart
										: pause.absoluteMsStart;
							const x2Val =
								xAxisMode === "distance"
									? pause.distanceKmEnd
									: xAxisMode === "relative-time"
										? pause.elapsedSecondsEnd
										: pause.absoluteMsEnd;
							return (
								<ReferenceArea
									// biome-ignore lint/suspicious/noArrayIndexKey: pause segments are positional
									key={i}
									x1={x1Val}
									x2={x2Val}
									fill="rgba(156,163,175,0.35)"
									stroke="none"
								/>
							);
						})}

						<Area
							type="monotone"
							dataKey="elevationM"
							stroke="#f97316"
							strokeWidth={1.5}
							fill="url(#ep-area-fill)"
							isAnimationActive={false}
							dot={false}
							activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
						/>

						{markers.length > 0 && (
							<MarkerOverlay markers={markers} data={data} xAxisMode={xAxisMode} />
						)}

						{zoom && (
							<SelectionOverlay
								range={drag ?? selection}
								showHandles={!drag && zoomDomain != null}
								xAxisMode={xAxisMode}
								data={data}
								onHandleMouseDown={setDraggingHandle}
							/>
						)}

						{showGradientStrip && gradientSegments && <GradientStrip segments={gradientSegments} />}
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
