"use client";

import { useCallback, useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// ── 타입 ─────────────────────────────────────────────────────────
export interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도 (m)
	d?: number; // 누적 거리 (m)
}

interface ChartDatum {
	distanceKm: number;
	ele: number;
	index: number; // 원본 track_points 인덱스
}

interface ElevationProfileProps {
	/** RideWithGPS track_points */
	trackPoints: TrackPoint[];
	/** 현재 강조할 포인트 인덱스 (원본 track_points 기준, 나중에 위치 연동용) */
	positionIndex?: number | null;
	/** 마우스 호버 시 가장 가까운 포인트 인덱스 전달 (나중에 지도 마커 연동용) */
	onPositionChange?: (index: number | null) => void;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────

/** track_points 를 차트용 샘플로 축소 (고도값 있는 포인트만 추출) */
function buildChartData(points: TrackPoint[], maxSamples = 2000): ChartDatum[] {
	const withEle = points.filter(
		(p) => p.e != null && p.d != null,
	);
	if (withEle.length === 0) return [];

	const step = Math.ceil(withEle.length / maxSamples);
	return withEle
		.filter((_, i) => i % step === 0)
		.map((p, _i, _arr) => ({
			distanceKm: Math.round((p.d! / 1000) * 100) / 100,
			ele: Math.round(p.e!),
			index: points.indexOf(p),
		}));
}

const STROKE_COLOR = "#f97316"; // orange-500
const FILL_COLOR = "#fed7aa"; // orange-200

// ── 커스텀 툴팁 ───────────────────────────────────────────────────
function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: ChartDatum }>;
}) {
	if (!active || !payload?.length) return null;
	const d = payload[0].payload;
	return (
		<div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs dark:border-zinc-700 dark:bg-zinc-800">
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">
				{d.distanceKm.toFixed(1)} km
			</p>
			<p className="text-orange-500">{d.ele} m</p>
		</div>
	);
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function ElevationProfile({
	trackPoints,
	positionIndex = null,
	onPositionChange,
}: ElevationProfileProps) {
	const chartData = useMemo(() => buildChartData(trackPoints), [trackPoints]);

	// 차트 인덱스 → 원본 포인트 인덱스 역매핑
	const handleMouseMove = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(state: any) => {
			if (!onPositionChange) return;
			const ci: number | null | undefined = state?.activeTooltipIndex;
			if (ci == null || !chartData[ci]) {
				onPositionChange(null);
				return;
			}
			onPositionChange(chartData[ci].index);
		},
		[chartData, onPositionChange],
	);

	const handleMouseLeave = useCallback(() => {
		onPositionChange?.(null);
	}, [onPositionChange]);

	// ⚠️ 모든 Hook은 early return 전에 선언해야 함
	const currentChartDatum = useMemo(() => {
		if (positionIndex == null || chartData.length === 0) return null;
		return chartData.reduce<ChartDatum | null>((best, d) => {
			if (!best) return d;
			return Math.abs(d.index - positionIndex) <
				Math.abs(best.index - positionIndex)
				? d
				: best;
		}, null);
	}, [positionIndex, chartData]);

	const totalKm = chartData.length > 0
		? chartData[chartData.length - 1].distanceKm
		: 0;

	if (chartData.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col gap-1 px-2 pt-2">
			{/* 범례 헤더 */}
			<div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<span className="font-medium text-zinc-700 dark:text-zinc-300">
					고도 프로필
				</span>
				<span>총 {totalKm.toFixed(0)} km</span>
			</div>

			{/* 차트 */}
			<div className="flex-1 min-h-0">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={chartData}
						margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
					>
						<defs>
							<linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={STROKE_COLOR} stopOpacity={0.4} />
								<stop offset="95%" stopColor={STROKE_COLOR} stopOpacity={0.05} />
							</linearGradient>
						</defs>

						<CartesianGrid
							strokeDasharray="3 3"
							stroke="rgba(0,0,0,0.07)"
						/>

						<XAxis
							dataKey="distanceKm"
							type="number"
							domain={["dataMin", "dataMax"]}
							tickFormatter={(v) => `${v} km`}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
						/>

						<YAxis
							dataKey="ele"
							type="number"
							tickFormatter={(v) => `${v}`}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							width={38}
							label={{
								value: "m",
								angle: -90,
								position: "insideLeft",
								style: { fill: "#9ca3af", fontSize: 10 },
							}}
						/>

						<Tooltip
							cursor={{ stroke: STROKE_COLOR, strokeWidth: 1, strokeDasharray: "4 2" }}
							content={<CustomTooltip />}
						/>

						<Area
							type="monotone"
							dataKey="ele"
							stroke={STROKE_COLOR}
							strokeWidth={1.5}
							fill="url(#eleGradient)"
							isAnimationActive={false}
							activeDot={{ r: 4, fill: STROKE_COLOR, stroke: "#fff", strokeWidth: 2 }}
						/>

						{/* 외부 제어 마커 (지도 연동용 - 나중에 활성화) */}
						{currentChartDatum != null && (
							<>
								<ReferenceLine
									x={currentChartDatum.distanceKm}
									stroke={STROKE_COLOR}
									strokeWidth={1.5}
									strokeDasharray="4 2"
								/>
								<ReferenceDot
									x={currentChartDatum.distanceKm}
									y={currentChartDatum.ele}
									r={5}
									fill={STROKE_COLOR}
									stroke="#fff"
									strokeWidth={2}
								/>
							</>
						)}
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
