"use client";

import type { ActivityStats } from "@/lib/stats";

type StatsCardProps = {
	stats: ActivityStats;
};

export function StatsCard({ stats }: StatsCardProps) {
	const formatNumber = (num: number): string => {
		return num.toLocaleString("ko-KR");
	};

	const formatElevation = (meters: number): { value: string; unit: string } => {
		if (meters === 0) return { value: "N/A", unit: "m" };
		// 100,000m 이상이면 km로 변환
		if (meters >= 100000) {
			const km = meters / 1000;
			return {
				value: formatNumber(Math.round(km * 10) / 10), // 소수점 첫째 자리까지
				unit: "km",
			};
		}
		return { value: formatNumber(Math.round(meters)), unit: "m" };
	};

	const formatTime = (hours: number, shortFormat = false): string => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);

		if (shortFormat) {
			// 전체 통계용: 999h 이하는 분 표시, 1000h 이상은 분 생략
			if (h >= 1000) {
				return `${formatNumber(h)}h`;
			}
			if (h === 0) return `${m}분`;
			if (m === 0) return `${formatNumber(h)}h`;
			return `${formatNumber(h)}h ${m}분`;
		} else {
			// 연도별 통계용: 999시간 이하는 분 표시, 1000시간 이상은 분 생략
			if (h >= 1000) {
				return `${formatNumber(h)}시간`;
			}
			if (h === 0) return `${m}분`;
			if (m === 0) return `${formatNumber(h)}시간`;
			return `${formatNumber(h)}시간 ${m}분`;
		}
	};

	const years = Object.keys(stats.byYear).sort().reverse();

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 className="text-lg sm:text-xl font-semibold mb-4">통계</h2>

			{/* 전체 통계 */}
			<div className="mb-6 p-4 lg:p-5 bg-gray-50 rounded-lg">
				<h3 className="text-base sm:text-lg font-semibold mb-3 lg:mb-4">전체 통계</h3>
				<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-3 xl:gap-4">
					<div className="min-w-0 overflow-hidden">
						<p className="text-xs sm:text-sm text-gray-600 mb-1">총 거리 (km)</p>
						<p className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold break-all">
							{formatNumber(Math.round(stats.totalDistance))}
						</p>
					</div>
					<div className="min-w-0 overflow-hidden">
						{(() => {
							const elevation = formatElevation(stats.totalElevation);
							return (
								<>
									<p className="text-xs sm:text-sm text-gray-600 mb-1">
										총 고도 ({elevation.unit})
									</p>
									<p className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold break-all">
										{elevation.value}
									</p>
								</>
							);
						})()}
					</div>
					<div className="min-w-0 overflow-hidden">
						<p className="text-xs sm:text-sm text-gray-600 mb-1">총 시간</p>
						<p className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold break-all">
							{formatTime(stats.totalTime, true)}
						</p>
					</div>
					<div className="min-w-0 overflow-hidden">
						<p className="text-xs sm:text-sm text-gray-600 mb-1">총 횟수 (회)</p>
						<p className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold break-all">
							{formatNumber(stats.totalCount)}
						</p>
					</div>
				</div>
			</div>

			{/* 연도별 통계 */}
			{years.length > 0 && (
				<div>
					<h3 className="text-base sm:text-lg font-semibold mb-3 lg:mb-4">연도별 통계</h3>
					<div className="space-y-2 lg:space-y-2">
						{years.map((year) => {
							const yearStats = stats.byYear[year];
							return (
								<div
									key={year}
									className="p-3 sm:p-4 lg:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<div className="flex items-center justify-between mb-2 lg:mb-2">
										<h4 className="font-semibold text-base sm:text-lg lg:text-base">{year}년</h4>
										<span className="text-xs sm:text-sm text-gray-600">{yearStats.count}회</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-3 text-xs sm:text-sm">
										<div>
											<span className="text-gray-600">거리: </span>
											<span className="font-semibold whitespace-nowrap">
												{formatNumber(yearStats.distance)} km
											</span>
										</div>
										<div>
											{(() => {
												const elevation = formatElevation(yearStats.elevation);
												return (
													<>
														<span className="text-gray-600">고도: </span>
														<span className="font-semibold whitespace-nowrap">
															{elevation.value} {elevation.unit}
														</span>
													</>
												);
											})()}
										</div>
										<div>
											<span className="text-gray-600">시간: </span>
											<span className="font-semibold whitespace-nowrap">
												{formatTime(yearStats.time)}
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{years.length === 0 && (
				<p className="text-gray-500 text-center py-8">필터 조건에 맞는 활동이 없습니다.</p>
			)}
		</div>
	);
}
