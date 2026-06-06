"use client";

import { useState, useMemo } from "react";
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
} from "recharts";
import type { TooltipContentProps } from "recharts";
import {
	computeGradientSegments,
	DOWNHILL_COLOR,
} from "@my-ridings/plan-geometry";
import type { GradientSegment } from "@my-ridings/plan-geometry";
import type { StravaActivity, ActivityStreams, XAxisMode, ChartPoint, PauseSegment } from "@/src/types";
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
};

const X_AXIS_MODES: { value: XAxisMode; label: string }[] = [
	{ value: "distance", label: "거리" },
	{ value: "relative-time", label: "상대 시간" },
	{ value: "absolute-time", label: "절대 시간" },
];

const GRADIENT_STRIP_HEIGHT = 8;
const GRADIENT_STRIP_TOP_GAP = 2;

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

export function RidingProfile({ activity, streams, onHoverPoint }: Props) {
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

	const handleMouseMove = (state: { activeTooltipIndex?: number | string | null }) => {
		const idx = typeof state.activeTooltipIndex === "number" ? state.activeTooltipIndex : null;
		if (idx == null) return;
		const point = chartData[idx] as ChartPoint | undefined;
		if (!point) return;
		const latlng = streams.latlng?.[point.streamIndex];
		onHoverPoint?.(latlng ?? null);
	};

	const handleMouseLeave = () => {
		onHoverPoint?.(null);
	};

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

			<ResponsiveContainer width="100%" height={280}>
				<AreaChart
					data={chartData}
					margin={{ top: 10, right: 10, left: 0, bottom: 16 }}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
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
					<Tooltip content={CustomTooltip} />
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
	);
}
