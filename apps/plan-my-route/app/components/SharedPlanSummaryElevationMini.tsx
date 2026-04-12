"use client";

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

	const data = useMemo(() => {
		const withEle = trackPoints.filter((p) => p.e != null && p.d != null);
		if (withEle.length === 0) return [];
		const maxSamples = 480;
		const step = Math.max(1, Math.ceil(withEle.length / maxSamples));
		const out: { km: number; elevation: number }[] = [];
		for (let i = 0; i < withEle.length; i += step) {
			out.push({
				km: Math.round((withEle[i].d! / 1000) * 10) / 10,
				elevation: Math.round(withEle[i].e!),
			});
		}
		const last = withEle[withEle.length - 1];
		const lastKm = Math.round((last.d! / 1000) * 10) / 10;
		if (out.length > 0 && out[out.length - 1].km !== lastKm) {
			out.push({ km: lastKm, elevation: Math.round(last.e!) });
		}
		return out;
	}, [trackPoints]);

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
					dataKey="km"
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
					dataKey="elevation"
					stroke="#f97316"
					strokeWidth={1.5}
					fill={`url(#pmr-sum-elev-${gradId})`}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
