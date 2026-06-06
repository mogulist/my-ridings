"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, Clock, MapPin } from "lucide-react";
import { dbUtils } from "@/lib/indexeddb";
import { stravaApi } from "@/lib/strava-api";
import { RidingProfile } from "@/components/RidingProfile";
import { RouteMap } from "@/components/RouteMap";
import { formatStravaLocalDate } from "@/lib/strava-date";
import type { ActivityStreams, StravaActivity } from "@/src/types";

function StatChip({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
			{children}
		</span>
	);
}

function formatTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h === 0) return `${m}분`;
	if (m === 0) return `${h}시간`;
	return `${h}시간 ${m}분`;
}

export default function ActivityDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = Number(params.id);

	const [activity, setActivity] = useState<StravaActivity | null>(null);
	const [streams, setStreams] = useState<ActivityStreams | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [streamsLoading, setStreamsLoading] = useState(true);
	const [highlightPosition, setHighlightPosition] = useState<[number, number] | null>(null);

	useEffect(() => {
		if (!id || isNaN(id)) {
			setError("잘못된 활동 ID입니다.");
			return;
		}

		let cancelled = false;

		async function load() {
			try {
				const act = await dbUtils.getActivityById(id);
				if (cancelled) return;
				if (!act) {
					setError("활동을 찾을 수 없습니다.");
					return;
				}
				setActivity(act);

				// 캐시 확인: latlng가 있는 경우만 캐시 사용 (소프트 체크)
				const cached = await dbUtils.getStreams(id);
				if (cancelled) return;
				if (cached && cached.latlng && cached.latlng.length > 0) {
					setStreams(cached);
					setStreamsLoading(false);
					return;
				}

				const fetched = await stravaApi.getActivityStreams(id);
				if (cancelled) return;
				await dbUtils.saveStreams(fetched);
				setStreams(fetched);
			} catch (err) {
				if (!cancelled) {
					console.error("활동 로드 실패:", err);
					setError("데이터를 불러오는 데 실패했습니다. 로그인이 필요할 수 있습니다.");
				}
			} finally {
				if (!cancelled) setStreamsLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const polyline = streams?.latlng && streams.latlng.length > 0
		? streams.latlng
		: undefined;

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center space-y-3">
					<p className="text-gray-600">{error}</p>
					<button
						type="button"
						onClick={() => router.back()}
						className="text-blue-600 hover:underline text-sm"
					>
						돌아가기
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* 헤더 */}
			<div className="bg-white shadow-sm sticky top-0 z-10">
				<div className="px-4 py-3 flex items-center gap-3">
					<button
						type="button"
						onClick={() => router.back()}
						className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
						aria-label="뒤로가기"
					>
						<ArrowLeft className="size-5" />
					</button>
					<div className="flex-1 min-w-0">
						{activity ? (
							<>
								<h1 className="font-semibold text-gray-900 truncate">{activity.name}</h1>
								<p className="text-xs text-gray-500">
									{formatStravaLocalDate(activity.start_date_local)}
								</p>
							</>
						) : (
							<div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
						)}
					</div>
				</div>
			</div>

			<div className="px-4 py-4 space-y-4">
				{/* 요약 chips */}
				{activity && (
					<div className="flex flex-wrap gap-2">
						<StatChip>
							<MapPin className="size-3.5" />
							{(activity.distance / 1000).toFixed(1)} km
						</StatChip>
						{activity.total_elevation_gain != null && activity.total_elevation_gain > 0 && (
							<StatChip>
								<ArrowUp className="size-3.5 text-green-600" />
								{Math.round(activity.total_elevation_gain)} m
							</StatChip>
						)}
						<StatChip>
							<Clock className="size-3.5" />
							{formatTime(activity.moving_time)}
						</StatChip>
					</div>
				)}

				{/* 지도 */}
				<div className="rounded-lg overflow-hidden shadow" style={{ height: "40vh", minHeight: "220px" }}>
					<RouteMap
						width="100%"
						height="100%"
						polyline={polyline}
						highlightPosition={highlightPosition}
					/>
				</div>

				{/* 라이딩 프로필 */}
				{streamsLoading ? (
					<div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
						<div className="text-center space-y-2">
							<div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
							<p className="text-sm text-gray-500">스트림 데이터 로딩 중...</p>
						</div>
					</div>
				) : activity && streams && streams.altitude.length > 0 ? (
					<RidingProfile
						activity={activity}
						streams={streams}
						onHoverPoint={setHighlightPosition}
					/>
				) : activity && streams && streams.altitude.length === 0 ? (
					<div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">
						이 활동에는 고도 데이터가 없습니다.
					</div>
				) : null}
			</div>
		</div>
	);
}
