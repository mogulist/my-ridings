"use client";

import { ArrowUp, BarChart2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGearInfos } from "@/lib/gear-cache";
import { getSportTypeDisplayName } from "@/lib/sport-types";
import { type ActivitySortOrder, sortActivities } from "@/lib/sort";
import { formatStravaLocalDate } from "@/lib/strava-date";
import type { StravaActivity } from "@/src/types";

type ActivityListProps = {
	activities: StravaActivity[];
};

const SORT_OPTIONS: { value: ActivitySortOrder; label: string }[] = [
	{ value: "date-desc", label: "최신 순" },
	{ value: "date-asc", label: "오래된 순" },
	{ value: "distance-desc", label: "거리 긴 순" },
	{ value: "duration-desc", label: "시간 긴 순" },
];

export function ActivityList({ activities }: ActivityListProps) {
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [sortOrder, setSortOrder] = useState<ActivitySortOrder>("date-desc");
	const [gearNames, setGearNames] = useState<Map<string, string>>(new Map());
	const router = useRouter();
	const sortedActivities = sortActivities(activities, sortOrder);

	useEffect(() => {
		const gearIds = activities
			.map((activity) => activity.gear_id)
			.filter((gearId): gearId is string => gearId !== null);

		if (gearIds.length === 0) {
			setGearNames(new Map());
			return;
		}

		let isCancelled = false;

		const loadGearNames = async () => {
			try {
				const gearMap = await getGearInfos(gearIds);
				if (isCancelled) return;

				const names = new Map<string, string>();
				for (const [gearId, gearInfo] of gearMap) {
					names.set(gearId, gearInfo.name);
				}
				setGearNames(names);
			} catch (error) {
				console.error("자전거 정보 로드 실패:", error);
			}
		};

		loadGearNames();

		return () => {
			isCancelled = true;
		};
	}, [activities]);

	const formatDistanceKm = (meters: number): string => {
		return `${(meters / 1000).toFixed(2)}km`;
	};

	const formatElevationGain = (meters: number): string => {
		return `${Math.round(meters)}m`;
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
			<div className="flex items-center justify-between gap-3 mb-4">
				<h2 className="text-lg sm:text-xl font-semibold">활동 목록 ({activities.length}개)</h2>
				<select
					value={sortOrder}
					onChange={(e) => setSortOrder(e.target.value as ActivitySortOrder)}
					className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shrink-0"
					aria-label="활동 정렬"
				>
					{SORT_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
			<div className="space-y-2 lg:max-h-[calc(100vh-28rem)] lg:overflow-y-auto">
				{sortedActivities.map((activity) => {
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
										<span className="break-words">
											{formatStravaLocalDate(activity.start_date_local)}
										</span>
										<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs whitespace-nowrap">
											{getSportTypeDisplayName(activity.type)}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
								  <button
								    type="button"
								    onClick={(e) => {
								      e.stopPropagation();
								      router.push(`/activity/${activity.id}`);
								    }}
								    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
								    aria-label="라이딩 프로필 보기"
								  >
								    <BarChart2 className="size-4" />
								  </button>
								  <div className="text-right">
									<div className="flex flex-wrap items-center justify-end gap-2 text-sm sm:text-base font-semibold tabular-nums">
										<span className="inline-flex items-center gap-0.5 text-gray-900">
											<MapPin className="size-3.5 shrink-0 text-gray-500" aria-hidden />
											{formatDistanceKm(activity.distance)}
										</span>
										{activity.total_elevation_gain != null && activity.total_elevation_gain > 0 ? (
											<span className="inline-flex items-center gap-0.5 text-green-600">
												<ArrowUp className="size-3.5 shrink-0" aria-hidden />
												{formatElevationGain(activity.total_elevation_gain)}
											</span>
										) : null}
									</div>
									<p className="text-xs sm:text-sm text-gray-600">
										{formatTime(activity.moving_time)}
									</p>
								  </div>
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
												<p className="font-semibold break-words">
													{gearNames.get(activity.gear_id) ?? activity.gear_id}
												</p>
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
