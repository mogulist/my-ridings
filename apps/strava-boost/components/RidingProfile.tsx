"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceArea,
	ReferenceLine,
	usePlotArea,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import {
	computeGradientSegments,
	DOWNHILL_COLOR,
} from "@my-ridings/plan-geometry";
import type { GradientSegment } from "@my-ridings/plan-geometry";
import type { StravaActivity, ActivityStreams, XAxisMode, ChartPoint, PauseSegment, SummitPoi, EventInfo } from "@/src/types";
import { parseStravaLocalDate } from "@/lib/strava-date";
import {
	buildChartData,
	detectPauses,
	formatDistanceAxis,
	formatRelativeTimeAxis,
	formatAbsoluteTimeAxis,
	formatAbsoluteTimeTooltip,
} from "@/lib/riding-profile-utils";

type Props = {
	activity: StravaActivity;
	streams: ActivityStreams;
	onHoverPoint?: (pos: [number, number] | null) => void;
	summits?: SummitPoi[];
	eventInfo?: EventInfo | null;
};

const X_AXIS_MODES: { value: XAxisMode; label: string }[] = [
	{ value: "distance", label: "거리" },
	{ value: "relative-time", label: "상대 시간" },
	{ value: "absolute-time", label: "절대 시간" },
];

const GRADIENT_STRIP_HEIGHT = 8;
const GRADIENT_STRIP_TOP_GAP = 2;
const YAXIS_W = 45;
const CHART_MARGIN_R = 10;

function GradientStripOverlay({
	segments,
	totalDistanceKm,
}: {
	segments: GradientSegment[];
	totalDistanceKm: number;
}) {
	const plotArea = usePlotArea();
	if (!plotArea || totalDistanceKm <= 0 || plotArea.width <= 0) return null;
	const { x, y, width, height } = plotArea;
	const stripY = y + height + GRADIENT_STRIP_TOP_GAP;
	return (
		<g>
			<defs>
				<clipPath id="gradStrip">
					<rect x={x} y={stripY} width={width} height={GRADIENT_STRIP_HEIGHT} rx={2} />
				</clipPath>
			</defs>
			<g clipPath="url(#gradStrip)">
				{segments.map((seg, i) => {
					if (seg.color === DOWNHILL_COLOR) return null;
					const startFrac = Math.max(0, seg.startKm / totalDistanceKm);
					const endFrac = Math.min(1, seg.endKm / totalDistanceKm);
					if (endFrac <= startFrac) return null;
					return (
						<rect
							key={i}
							x={x + startFrac * width}
							y={stripY}
							width={(endFrac - startFrac) * width}
							height={GRADIENT_STRIP_HEIGHT}
							fill={seg.color}
						/>
					);
				})}
			</g>
		</g>
	);
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload as ChartPoint;

	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
			<p className="font-semibold text-gray-800">고도 {point.altitude} m</p>
			<p className="text-gray-500">거리 {point.distanceKm.toFixed(1)} km</p>
			<p className="text-gray-500">
				경과 {formatRelativeTimeAxis(point.elapsedSeconds)}
			</p>
			<p className="text-gray-500">
				{formatAbsoluteTimeTooltip(point.absoluteMs)}
			</p>
		</div>
	);
}

const WAYPOINT_STYLES: Record<string, { stroke: string; dashArray: string }> = {
	summit:     { stroke: "#7c3aed", dashArray: "4 3" },
	supply:     { stroke: "#2563eb", dashArray: "" },
	water:      { stroke: "#0891b2", dashArray: "" },
	cutoff:     { stroke: "#dc2626", dashArray: "6 3" },
	checkpoint: { stroke: "#16a34a", dashArray: "" },
	start:      { stroke: "#16a34a", dashArray: "" },
	finish:     { stroke: "#16a34a", dashArray: "" },
	rest:       { stroke: "#9ca3af", dashArray: "3 3" },
};

function formatCutoffTime(startMs: number, cutoffSeconds: number): string {
	const ms = startMs + cutoffSeconds * 1000;
	return new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function distanceKmToXValue(distKm: number, data: ChartPoint[], mode: XAxisMode): number {
	if (mode === "distance" || data.length === 0) return distKm;
	let lo = 0, hi = data.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (data[mid].distanceKm < distKm) lo = mid + 1;
		else hi = mid;
	}
	return mode === "relative-time" ? data[lo].elapsedSeconds : data[lo].absoluteMs;
}

function PoiLabel({ viewBox, label, color, index }: {
	viewBox?: { x?: number; y?: number };
	label: string;
	color: string;
	index: number;
}) {
	const x = viewBox?.x ?? 0;
	const y = (viewBox?.y ?? 10) + (index % 3) * 14;
	return (
		<g>
			<text
				x={x + 4}
				y={y + 12}
				fill={color}
				fontSize={9}
				fontWeight={600}
				style={{ pointerEvents: "none", userSelect: "none" }}
			>
				{label}
			</text>
		</g>
	);
}

export function RidingProfile({ activity, streams, onHoverPoint, summits = [], eventInfo = null }: Props) {
	const [xAxisMode, setXAxisMode] = useState<XAxisMode>("distance");

	const startMs = useMemo(
		() => parseStravaLocalDate(activity.start_date_local).getTime(),
		[activity.start_date_local],
	);
	const chartData = useMemo(() => buildChartData(streams, startMs), [streams, startMs]);
	const pauses = useMemo(() => detectPauses(streams, startMs), [streams, startMs]);

	// plan-geometry용 TrackPoint 변환 (altitude + distance만 사용하므로 latlng 불필요)
	const trackPoints = useMemo(() => {
		const len = Math.min(streams.altitude.length, streams.distance.length);
		return Array.from({ length: len }, (_, i) => ({
			x: streams.latlng?.[i]?.[1] ?? 0,
			y: streams.latlng?.[i]?.[0] ?? 0,
			e: streams.altitude[i],
			d: streams.distance[i],
		}));
	}, [streams]);

	const gradientSegments = useMemo(
		() => computeGradientSegments(trackPoints),
		[trackPoints],
	);

	const totalDistanceKm = useMemo(
		() => (chartData.length > 0 ? chartData[chartData.length - 1].distanceKm : 0),
		[chartData],
	);

	const xAxisDataKey: keyof ChartPoint =
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

	const altitudes = chartData.map((p) => p.altitude);
	const minAlt = Math.max(0, Math.min(...altitudes) - 20);
	const maxAlt = Math.max(...altitudes) + 50;

	// recharts onMouseMove는 numeric XAxis에서 activePayload를 신뢰할 수 없음.
	// 대신 wrapper div의 네이티브 mousemove로 픽셀 → 데이터 직접 변환.
	const containerRef = useRef<HTMLDivElement>(null);

	function pointAtClientX(clientX: number): ChartPoint | null {
		if (!containerRef.current || chartData.length < 2) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const plotWidth = rect.width - YAXIS_W - CHART_MARGIN_R;
		if (mouseX < YAXIS_W || mouseX > YAXIS_W + plotWidth || plotWidth <= 0) return null;

		const fraction = (mouseX - YAXIS_W) / plotWidth;

		const getX = (p: ChartPoint) =>
			xAxisMode === "distance"
				? p.distanceKm
				: xAxisMode === "relative-time"
					? p.elapsedSeconds
					: p.absoluteMs;

		const xMin = getX(chartData[0]);
		const xMax = getX(chartData[chartData.length - 1]);
		if (xMax === xMin) return null;
		const targetX = xMin + fraction * (xMax - xMin);

		// binary search: first index where getX >= targetX
		let lo = 0, hi = chartData.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (getX(chartData[mid]) < targetX) lo = mid + 1;
			else hi = mid;
		}
		const best =
			lo > 0 &&
			Math.abs(getX(chartData[lo - 1]) - targetX) <
				Math.abs(getX(chartData[lo]) - targetX)
				? lo - 1
				: lo;

		return chartData[best] ?? null;
	}

	function handleWrapperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
		if (!onHoverPoint) return;
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		const latlng = streams.latlng?.[point.streamIndex];
		onHoverPoint(latlng ?? null);
	}

	function handleWrapperMouseLeave() {
		onHoverPoint?.(null);
	}

	// 우클릭 시 해당 지점의 GPS 좌표/거리/고도를 복사할 수 있는 컨텍스트 메뉴
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number; point: ChartPoint } | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, point });
	}

	useEffect(() => {
		if (!contextMenu) return;
		const close = () => setContextMenu(null);
		document.addEventListener("click", close);
		return () => document.removeEventListener("click", close);
	}, [contextMenu]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 2000);
		return () => clearTimeout(timer);
	}, [toast]);

	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			setToast(`${label} 복사됨: ${text}`);
		} catch {
			setToast("복사 실패");
		}
		setContextMenu(null);
	}

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<div className="flex items-center justify-between flex-wrap gap-3 mb-4">
				<h2 className="text-lg font-semibold text-gray-800">라이딩 프로필</h2>
				<div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
					{X_AXIS_MODES.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => setXAxisMode(mode.value)}
							className={[
								"px-3 py-1.5 transition-colors",
								xAxisMode === mode.value
									? "bg-blue-600 text-white font-medium"
									: "bg-white text-gray-600 hover:bg-gray-50",
							].join(" ")}
						>
							{mode.label}
						</button>
					))}
				</div>
			</div>

			<div
				ref={containerRef}
				onMouseMove={handleWrapperMouseMove}
				onMouseLeave={handleWrapperMouseLeave}
				onContextMenu={handleContextMenu}
			>
			<ResponsiveContainer width="100%" height={280}>
				<AreaChart
					data={chartData}
					margin={{ top: 10, right: 10, left: 0, bottom: 16 }}
				>
					<defs>
						<linearGradient id="ridingGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
							<stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
					<XAxis
						dataKey={xAxisDataKey}
						type="number"
						domain={["dataMin", "dataMax"]}
						tickFormatter={xTickFormatter}
						tick={{ fill: "#9ca3af", fontSize: 10 }}
						tickLine={false}
						axisLine={false}
						tickCount={6}
					/>
					<YAxis
						domain={[minAlt, maxAlt]}
						tickFormatter={(v: number) => `${v}m`}
						tick={{ fill: "#9ca3af", fontSize: 10 }}
						tickLine={false}
						axisLine={false}
						width={45}
					/>
					<Tooltip content={CustomTooltip} active={contextMenu ? false : undefined} />
					{pauses.map((pause: PauseSegment, i: number) => {
						const x1 =
							xAxisMode === "distance"
								? pause.distanceKmStart
								: xAxisMode === "relative-time"
									? pause.elapsedSecondsStart
									: pause.absoluteMsStart;
						const x2 =
							xAxisMode === "distance"
								? pause.distanceKmEnd
								: xAxisMode === "relative-time"
									? pause.elapsedSecondsEnd
									: pause.absoluteMsEnd;
						return (
							<ReferenceArea
								key={i}
								x1={x1}
								x2={x2}
								fill="rgba(156,163,175,0.25)"
								stroke="rgba(156,163,175,0.5)"
								strokeWidth={1}
								strokeDasharray="4 2"
							/>
						);
					})}
					{/* 서밋 마커 */}
					{summits.map((summit, i) => {
						const xVal = distanceKmToXValue(summit.distanceKm, chartData, xAxisMode);
						return (
							<ReferenceLine
								key={`summit-${summit.id}`}
								x={xVal}
								stroke="#7c3aed"
								strokeWidth={1.5}
								strokeDasharray="4 3"
								label={(props) => (
									<PoiLabel
										{...props}
										label={summit.name}
										color="#7c3aed"
										index={i}
									/>
								)}
							/>
						);
					})}
					{/* 이벤트 경유지 마커 */}
					{eventInfo?.waypoints.map((wp, i) => {
						const xVal = distanceKmToXValue(wp.distanceKm, chartData, xAxisMode);
						const style = WAYPOINT_STYLES[wp.waypoint_type] ?? WAYPOINT_STYLES.checkpoint;
						const label =
							wp.waypoint_type === "cutoff" && wp.cutoff_seconds_from_start != null
								? `${wp.name} (${formatCutoffTime(startMs, wp.cutoff_seconds_from_start)})`
								: wp.name;
						return (
							<ReferenceLine
								key={`wp-${wp.id}`}
								x={xVal}
								stroke={style.stroke}
								strokeWidth={1.5}
								strokeDasharray={style.dashArray || undefined}
								label={(props) => (
									<PoiLabel
										{...props}
										label={label}
										color={style.stroke}
										index={i + summits.length}
									/>
								)}
							/>
						);
					})}
					<Area
						type="monotone"
						dataKey="altitude"
						stroke="#f97316"
						strokeWidth={1.5}
						fill="url(#ridingGradient)"
						isAnimationActive={false}
						dot={false}
						activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
					/>
					{xAxisMode === "distance" && gradientSegments.length > 0 && (
						<GradientStripOverlay
							segments={gradientSegments}
							totalDistanceKm={totalDistanceKm}
						/>
					)}
				</AreaChart>
			</ResponsiveContainer>
			</div>

			{contextMenu && (() => {
				const { point } = contextMenu;
				const latlng = streams.latlng?.[point.streamIndex];
				return (
					<div
						className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-lg"
						style={{ left: contextMenu.x, top: contextMenu.y }}
						onContextMenu={(e) => e.preventDefault()}
					>
						<button
							type="button"
							disabled={!latlng}
							onClick={() =>
								latlng &&
								copyToClipboard(`${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)}`, "위경도 좌표")
							}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
						>
							📍 위경도 좌표 복사{latlng ? ` (${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)})` : ""}
						</button>
						<button
							type="button"
							onClick={() => copyToClipboard(point.distanceKm.toFixed(2), "경로 거리")}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100"
						>
							📏 경로 거리 복사 ({point.distanceKm.toFixed(2)} km)
						</button>
						<button
							type="button"
							onClick={() => copyToClipboard(String(Math.round(point.altitude)), "고도")}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100"
						>
							⛰️ 고도 복사 ({Math.round(point.altitude)} m)
						</button>
					</div>
				);
			})()}

			{toast && (
				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
					{toast}
				</div>
			)}
		</div>
	);
}
