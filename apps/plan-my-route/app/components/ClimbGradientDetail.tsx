"use client";

import { summarizeClimbRange } from "@my-ridings/plan-geometry";
import { useMemo } from "react";
import { ClimbGradientLegend } from "./ClimbGradientLegend";
import type { TrackPoint } from "./ElevationProfile";
import { GradientClimbProfile } from "./GradientClimbProfile";

export type ClimbGradientDetailProps = {
	title: string;
	subtitle?: string | null;
	trackPoints: TrackPoint[];
	startDistanceKm: number;
	endDistanceKm: number;
	/** 정상 등 종료 지점 (절대 km) — 차트에 세로선 */
	endMarkerDistanceKm?: number | null;
	chartHeightPx?: number;
	/** Wahoo 자동 구간 안내 */
	showAutoRangeNote?: boolean;
};

function formatNum(n: number): string {
	return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

export function ClimbGradientDetail({
	title,
	subtitle = null,
	trackPoints,
	startDistanceKm,
	endDistanceKm,
	endMarkerDistanceKm = null,
	chartHeightPx = 200,
	showAutoRangeNote = true,
}: ClimbGradientDetailProps) {
	const stats = useMemo(
		() => summarizeClimbRange(trackPoints, startDistanceKm, endDistanceKm),
		[trackPoints, startDistanceKm, endDistanceKm],
	);

	const summitRelativeKm =
		endMarkerDistanceKm != null
			? Math.max(0, endMarkerDistanceKm - startDistanceKm)
			: endDistanceKm - startDistanceKm;

	return (
		<div className="flex flex-col gap-3">
			<div>
				<h4 className="text-sm font-semibold text-foreground">{title}</h4>
				{subtitle ? (
					<p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
				) : null}
			</div>

			<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
				<div>
					<dt className="text-muted-foreground">길이</dt>
					<dd className="font-medium tabular-nums">{formatNum(stats.lengthKm)} km</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">상승</dt>
					<dd className="font-medium tabular-nums">{formatNum(stats.elevationGainM)} m</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">평균 경사</dt>
					<dd className="font-medium tabular-nums">{formatNum(stats.avgGradePercent)}%</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">최대 경사</dt>
					<dd className="font-medium tabular-nums">{formatNum(stats.maxGradePercent)}%</dd>
				</div>
			</dl>

			<GradientClimbProfile
				trackPoints={trackPoints}
				startDistanceKm={startDistanceKm}
				endDistanceKm={endDistanceKm}
				heightPx={chartHeightPx}
				summitRelativeKm={summitRelativeKm}
			/>

			<ClimbGradientLegend />

			{showAutoRangeNote ? (
				<p className="text-[10px] leading-relaxed text-muted-foreground">
					Wahoo Summit과 동일한 경사 색상·10m 구간 기준입니다. 구간은 자동 탐지되며 실제
					라이딩 경사계/DEM과 차이가 날 수 있습니다.
				</p>
			) : null}
		</div>
	);
}
