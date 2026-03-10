"use client";

import type { ActivityStats } from "@/lib/stats";

type YearlyStatsProps = {
	stats: ActivityStats;
	selectedYears: string[];
	onYearSelect: (year: string) => void;
	onClearSelection: () => void;
};

export function YearlyStats({
	stats,
	selectedYears,
	onYearSelect,
	onClearSelection,
}: YearlyStatsProps) {
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

		// 999시간 이하는 분 표시, 1000시간 이상은 분 생략
		if (h >= 1000) {
			return `${formatNumber(h)}시간`;
		}
		if (h === 0) return `${m}분`;
		if (m === 0) return `${formatNumber(h)}시간`;
		return `${formatNumber(h)}시간 ${m}분`;
	};

	const years = Object.keys(stats.byYear).sort().reverse();

	if (years.length === 0) {
		return (
			<div className="bg-white rounded-lg shadow p-4 sm:p-6">
				<h2 className="text-lg sm:text-xl font-semibold mb-4">연도별 통계</h2>
				<p className="text-gray-500 text-center py-8">필터 조건에 맞는 활동이 없습니다.</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg sm:text-xl font-semibold">연도별 통계</h2>
				{selectedYears.length > 0 && (
					<button
						onClick={onClearSelection}
						className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
					>
						선택 해제
					</button>
				)}
			</div>
			<div className="space-y-2 lg:max-h-[calc(100vh-28rem)] lg:overflow-y-auto">
				{years.map((year) => {
					const yearStats = stats.byYear[year];
					const elevation = formatElevation(yearStats.elevation);
					const isSelected = selectedYears.includes(year);
					return (
						<div
							key={year}
							onClick={() => onYearSelect(year)}
							className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
								isSelected
									? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
									: "border-gray-200 hover:bg-gray-50"
							}`}
						>
							<div className="flex items-center justify-between mb-2">
								<h4 className="font-semibold text-base sm:text-lg">{year}년</h4>
								<span className="text-xs sm:text-sm text-gray-600">{yearStats.count}회</span>
							</div>
							<div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
								<div>
									<span className="text-gray-600">거리: </span>
									<span className="font-semibold">{formatNumber(yearStats.distance)} km</span>
								</div>
								<div>
									<span className="text-gray-600">고도: </span>
									<span className="font-semibold">
										{elevation.value} {elevation.unit}
									</span>
								</div>
								<div>
									<span className="text-gray-600">시간: </span>
									<span className="font-semibold">{formatTime(yearStats.time)}</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
