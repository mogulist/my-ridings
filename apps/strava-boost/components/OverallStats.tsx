"use client";

import type { ActivityStats } from "@/lib/stats";

type OverallStatsProps = {
	stats: ActivityStats;
};

export function OverallStats({ stats }: OverallStatsProps) {
	const formatNumber = (num: number): string => {
		return num.toLocaleString("ko-KR");
	};

	const formatElevation = (meters: number): { value: string; unit: string } => {
		if (meters === 0) return { value: "N/A", unit: "m" };
		// 100,000m 이상이면 km로 변환
		if (meters >= 100000) {
			const km = meters / 1000;
			return {
				value: formatNumber(Math.round(km * 10) / 10),
				unit: "km",
			};
		}
		return { value: formatNumber(Math.round(meters)), unit: "m" };
	};

	const formatTime = (hours: number): string => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);

		// 999h 이하는 분 표시, 1000h 이상은 분 생략
		if (h >= 1000) {
			return `${formatNumber(h)}h`;
		}
		if (h === 0) return `${m}분`;
		if (m === 0) return `${formatNumber(h)}h`;
		return `${formatNumber(h)}h ${m}분`;
	};

	const elevation = formatElevation(stats.totalElevation);

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
				<div className="min-w-0 overflow-hidden">
					<p className="text-xs sm:text-sm text-gray-600 mb-2">총 거리 (km)</p>
					<p className="text-2xl sm:text-3xl font-bold break-all">
						{formatNumber(Math.round(stats.totalDistance))}
					</p>
				</div>
				<div className="min-w-0 overflow-hidden">
					<p className="text-xs sm:text-sm text-gray-600 mb-2">총 고도 ({elevation.unit})</p>
					<p className="text-2xl sm:text-3xl font-bold break-all">{elevation.value}</p>
				</div>
				<div className="min-w-0 overflow-hidden">
					<p className="text-xs sm:text-sm text-gray-600 mb-2">총 시간</p>
					<p className="text-2xl sm:text-3xl font-bold break-all">{formatTime(stats.totalTime)}</p>
				</div>
				<div className="min-w-0 overflow-hidden">
					<p className="text-xs sm:text-sm text-gray-600 mb-2">총 횟수 (회)</p>
					<p className="text-2xl sm:text-3xl font-bold break-all">
						{formatNumber(stats.totalCount)}
					</p>
				</div>
			</div>
		</div>
	);
}
