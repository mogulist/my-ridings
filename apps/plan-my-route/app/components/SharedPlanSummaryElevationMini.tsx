"use client";

import { fromTrackPoints } from "@my-ridings/elevation-profile";
import { useId, useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
} from "recharts";
import type { TrackPoint } from "./ElevationProfile";

type SharedPlanSummaryElevationMiniProps = {
	trackPoints: TrackPoint[];
	height?: number;
};

export function SharedPlanSummaryElevationMini({
	trackPoints,
	height = 88,
}: SharedPlanSummaryElevationMiniProps) {
	const gradId = useId().replace(/:/g, "");

	const data = useMemo(() => fromTrackPoints(trackPoints, 480), [trackPoints]);

	if (data.length === 0) {
		return (
			<div
				className="flex items-center justify-center px-2 text-center text-xs text-muted-foreground"
				style={{ minHeight: height }}
			>
				경로 트랙을 불러오면 전체 고도 프로필이 표시됩니다.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<AreaChart data={data} margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
				<defs>
					<linearGradient id={`pmr-sum-elev-${gradId}`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#f97316" stopOpacity={0.32} />
						<stop offset="95%" stopColor="#f97316" stopOpacity={0.04} />
					</linearGradient>
				</defs>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical
					horizontal={false}
					className="stroke-border/80"
				/>
				<XAxis
					dataKey="distanceKm"
					type="number"
					domain={["dataMin", "dataMax"]}
					tick={{ fontSize: 10 }}
					className="text-muted-foreground"
					tickFormatter={(v: number) => `${Math.round(v)}`}
					interval="preserveStartEnd"
					axisLine={false}
					tickLine={false}
				/>
				<Tooltip
					contentStyle={{
						fontSize: 11,
						borderRadius: 8,
					}}
				/>
				<Area
					type="monotone"
					dataKey="elevationM"
					stroke="#f97316"
					strokeWidth={1.5}
					fill={`url(#pmr-sum-elev-${gradId})`}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
