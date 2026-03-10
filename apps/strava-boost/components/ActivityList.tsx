"use client";

import { useState } from "react";
import { getSportTypeDisplayName } from "@/lib/sport-types";
import type { StravaActivity } from "@/src/types";

type ActivityListProps = {
	activities: StravaActivity[];
};

export function ActivityList({ activities }: ActivityListProps) {
	const [expandedId, setExpandedId] = useState<number | null>(null);

	const formatDate = (dateString: string): string => {
		return new Intl.DateTimeFormat("ko-KR", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(dateString));
	};

	const formatDistance = (meters: number): string => {
		const km = meters / 1000;
		return `${km.toFixed(2)} km`;
	};

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours === 0) return `${minutes}분`;
		if (minutes === 0) return `${hours}시간`;
		return `${hours}시간 ${minutes}분`;
	};

	const formatSpeed = (mps: number): string => {
		const kmh = (mps * 3600) / 1000;
		return `${kmh.toFixed(1)} km/h`;
	};

	if (activities.length === 0) {
		return (
			<div className="bg-white rounded-lg shadow p-4 sm:p-6">
				<h2 className="text-lg sm:text-xl font-semibold mb-4">활동 목록</h2>
				<p className="text-gray-500 text-center py-8 text-sm sm:text-base">활동이 없습니다.</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 className="text-lg sm:text-xl font-semibold mb-4">활동 목록 ({activities.length}개)</h2>
			<div className="space-y-2 lg:max-h-[calc(100vh-28rem)] lg:overflow-y-auto">
				{activities.map((activity) => {
					const isExpanded = expandedId === activity.id;
					return (
						<div
							key={activity.id}
							className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-manipulation transition-colors"
							onClick={() => setExpandedId(isExpanded ? null : activity.id)}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-base sm:text-lg mb-1 break-words">
										{activity.name}
									</h3>
									<div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
										<span className="break-words">{formatDate(activity.start_date_local)}</span>
										<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs whitespace-nowrap">
											{getSportTypeDisplayName(activity.type)}
										</span>
									</div>
								</div>
								<div className="text-right flex-shrink-0">
									<p className="font-semibold text-base sm:text-lg">
										{formatDistance(activity.distance)}
									</p>
									<p className="text-xs sm:text-sm text-gray-600">
										{formatTime(activity.moving_time)}
									</p>
								</div>
							</div>

							{isExpanded && (
								<div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
										<div>
											<p className="text-gray-600 mb-1">평균 속도</p>
											<p className="font-semibold">{formatSpeed(activity.average_speed)}</p>
										</div>
										<div>
											<p className="text-gray-600 mb-1">최대 속도</p>
											<p className="font-semibold">{formatSpeed(activity.max_speed)}</p>
										</div>
										<div>
											<p className="text-gray-600 mb-1">경과 시간</p>
											<p className="font-semibold">{formatTime(activity.elapsed_time)}</p>
										</div>
										{activity.gear_id && (
											<div>
												<p className="text-gray-600 mb-1">자전거</p>
												<p className="font-semibold break-words">{activity.gear_id}</p>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
