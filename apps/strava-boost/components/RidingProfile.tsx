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
	usePlotArea,
	useXAxisScale,
	useYAxisScale,
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

const WAYPOINT_COLORS: Record<string, string> = {
	summit:     "#7c3aed",
	supply:     "#2563eb",
	water:      "#0891b2",
	cutoff:     "#dc2626",
	checkpoint: "#16a34a",
	start:      "#16a34a",
	finish:     "#1d4ed8",
	rest:       "#6b7280",
};

function formatCutoffTime(startMs: number, cutoffSeconds: number): string {
	const ms = startMs + cutoffSeconds * 1000;
	return new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** 누적 거리(km) 기준으로 가장 가까운 ChartPoint 반환 */
function nearestChartPoint(distKm: number, data: ChartPoint[]): ChartPoint | null {
	if (data.length === 0) return null;
	let lo = 0, hi = data.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (data[mid].distanceKm < distKm) lo = mid + 1;
		else hi = mid;
	}
	return data[lo];
}

function chartPointToXValue(point: ChartPoint, mode: XAxisMode): number {
	if (mode === "distance") return point.distanceKm;
	return mode === "relative-time" ? point.elapsedSeconds : point.absoluteMs;
}

type PoiMarker = {
	id: string;
	label: string;
	color: string;
	xValue: number;
	altitude: number;
};

const POI_LABEL_TIERS = 3;
const POI_LABEL_ROW_HEIGHT = 13;
const POI_LABEL_CHAR_WIDTH = 7;
// 가장 높은 지점(플롯 영역 상단)과 1단 라벨 사이의 최소 간격
const POI_LABEL_GAP_PX = 24;
// 차트 위 여백: 간격 + 라벨 단(tier) 수만큼 + 약간의 여유
const POI_OVERLAY_TOP_MARGIN = POI_LABEL_GAP_PX + POI_LABEL_TIERS * POI_LABEL_ROW_HEIGHT + 4;

/** 곡선 위 작은 점 마커 + 상단 다단 라벨 + 라벨↔지점 연결 점선 */
function PoiOverlay({ markers }: { markers: PoiMarker[] }) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	const yScale = useYAxisScale();
	if (!plotArea || !xScale || !yScale || markers.length === 0) return null;

	const positioned = markers
		.map((m) => {
			const px = xScale(m.xValue);
			const py = yScale(m.altitude);
			if (px == null || py == null) return null;
			return { ...m, px, py };
		})
		.filter((m): m is PoiMarker & { px: number; py: number } => m !== null)
		.sort((a, b) => a.px - b.px);

	// 가로 위치 기준 충돌 회피: 겹치면 다음 단으로 내림 (최대 3단)
	const tierEndX: number[] = new Array(POI_LABEL_TIERS).fill(-Infinity);
	const tiered = positioned.map((m) => {
		const halfWidth = (m.label.length * POI_LABEL_CHAR_WIDTH) / 2 + 4;
		let tier = 0;
		while (tier < POI_LABEL_TIERS - 1 && m.px - halfWidth < tierEndX[tier]) tier++;
		tierEndX[tier] = m.px + halfWidth;
		return { ...m, tier };
	});

	return (
		<g style={{ pointerEvents: "none" }}>
			{tiered.map((m) => {
				const labelY = plotArea.y - POI_LABEL_GAP_PX - m.tier * POI_LABEL_ROW_HEIGHT - 4;
				return (
					<g key={m.id}>
						<line
							x1={m.px}
							y1={labelY + 3}
							x2={m.px}
							y2={m.py}
							stroke={m.color}
							strokeWidth={1}
							strokeDasharray="2 2"
							opacity={0.35}
						/>
						<circle cx={m.px} cy={m.py} r={4} fill="#fff" stroke={m.color} strokeWidth={2} />
						<text
							x={m.px}
							y={labelY}
							fill={m.color}
							fontSize={9}
							fontWeight={600}
							textAnchor="middle"
							style={{ userSelect: "none" }}
						>
							{m.label}
						</text>
					</g>
				);
			})}
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

	const poiMarkers = useMemo<PoiMarker[]>(() => {
		const markers: PoiMarker[] = [];

		for (const summit of summits) {
			const point = nearestChartPoint(summit.distanceKm, chartData);
			if (!point) continue;
			markers.push({
				id: `summit-${summit.id}`,
				label: summit.name,
				color: WAYPOINT_COLORS.summit,
				xValue: chartPointToXValue(point, xAxisMode),
				altitude: point.altitude,
			});
		}

		for (const wp of eventInfo?.waypoints ?? []) {
			const point = nearestChartPoint(wp.distanceKm, chartData);
			if (!point) continue;
			const label =
				wp.waypoint_type === "cutoff" && wp.cutoff_seconds_from_start != null
					? `${wp.name} (${formatCutoffTime(startMs, wp.cutoff_seconds_from_start)})`
					: wp.name;
			markers.push({
				id: `wp-${wp.id}`,
				label,
				color: WAYPOINT_COLORS[wp.waypoint_type] ?? WAYPOINT_COLORS.checkpoint,
				xValue: chartPointToXValue(point, xAxisMode),
				altitude: point.altitude,
			});
		}

		return markers;
	}, [summits, eventInfo, chartData, xAxisMode, startMs]);

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
	// Y축 최고 고도를 가장 높은 지점에 맞춰서, POI 라벨은 차트 위 여백(margin)에 배치
	const maxAlt = Math.max(...altitudes);

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
					margin={{ top: POI_OVERLAY_TOP_MARGIN, right: 10, left: 0, bottom: 16 }}
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
								fill="rgba(156,163,175,0.35)"
								stroke="none"
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
					<PoiOverlay markers={poiMarkers} />
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
