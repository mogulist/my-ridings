"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenIcon } from "lucide-react";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import { getStageColor, type Stage } from "../types/plan";
import { stageDayLabel } from "./PlanStagesPane";
import { MemoReviewPane } from "./MemoReviewPane";
import { RouteSummaryBlock } from "./RouteSummaryBlock";

type PublicPlanResponse = {
	plan: {
		id: string;
		name: string;
		start_date: string | null;
		public_share_token: string;
		shared_at: string | null;
	};
	route: {
		name: string;
		rwgps_url: string;
		total_distance: number | null;
		elevation_gain: number | null;
		elevation_loss: number | null;
	};
	stages: {
		id: string;
		title: string | null;
		start_distance: number | null;
		end_distance: number | null;
		elevation_gain: number | null;
		elevation_loss: number | null;
		memo: string | null;
	}[];
	author: { nickname: string | null };
};

type PublicPlanViewerProps = {
	token: string;
};

export function PublicPlanViewer({ token }: PublicPlanViewerProps) {
	const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
	const [publicPlan, setPublicPlan] = useState<PublicPlanResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeStageId, setActiveStageId] = useState<string | null>(null);
	const [positionIndex, setPositionIndex] = useState<number | null>(null);
	const [isPinned, setIsPinned] = useState(false);
	const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
	const [isMemoReviewOpen, setIsMemoReviewOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				const publicRes = await fetch(`/api/public/plans/${token}`);
				if (!publicRes.ok) throw new Error("공유 플랜을 불러오지 못했습니다.");
				const publicJson = (await publicRes.json()) as PublicPlanResponse;
				if (cancelled) return;
				setPublicPlan(publicJson);

				const rwgpsMatch = publicJson.route.rwgps_url.match(/\/routes\/(\d+)/);
				const rwgpsId = rwgpsMatch?.[1];
				if (!rwgpsId) throw new Error("경로 정보를 해석할 수 없습니다.");

				const routeRes = await fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
				if (!routeRes.ok) throw new Error("경로 지도를 불러오지 못했습니다.");
				const routeJson = (await routeRes.json()) as RideWithGPSRoute;
				if (cancelled) return;
				setRoute(routeJson);
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [token]);

	const stages = useMemo<Stage[]>(() => {
		const source = publicPlan?.stages ?? [];
		const sorted = [...source].sort(
			(a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0)
		);
		return sorted.map((stage, index) => {
			const startDistanceM = stage.start_distance ?? 0;
			const endDistanceM = stage.end_distance ?? startDistanceM;
			return {
				id: stage.id,
				dayNumber: index + 1,
				distanceKm: (endDistanceM - startDistanceM) / 1000,
				startDistanceKm: startDistanceM / 1000,
				endDistanceKm: endDistanceM / 1000,
				elevationGain: Number(stage.elevation_gain) || 0,
				elevationLoss: Number(stage.elevation_loss) || 0,
				isLastStage: false,
				memo: stage.memo ?? undefined,
			};
		});
	}, [publicPlan?.stages]);

	const totalRouteDistanceKm = useMemo(() => {
		if (route?.distance) return route.distance / 1000;
		return (publicPlan?.route.total_distance ?? 0) / 1000;
	}, [route?.distance, publicPlan?.route.total_distance]);

	const unplannedDistanceKm = useMemo(() => {
		if (stages.length === 0) return totalRouteDistanceKm;
		const lastEndKm = stages[stages.length - 1]?.endDistanceKm ?? 0;
		return Math.max(0, totalRouteDistanceKm - lastEndKm);
	}, [stages, totalRouteDistanceKm]);

	const effectiveSelectedDay = useMemo(() => {
		if (selectedDayNumber === null) return null;
		return stages.some((stage) => stage.dayNumber === selectedDayNumber)
			? selectedDayNumber
			: null;
	}, [selectedDayNumber, stages]);

	/** RouteViewer·PlanListPane과 동일하게 RWGPS 응답 우선, 없으면 DB 스냅샷 */
	const publicRouteSummary = useMemo(() => {
		if (!publicPlan) return null;
		const distanceM =
			route?.distance ?? publicPlan.route.total_distance ?? 0;
		const gain = route
			? Number(route.elevation_gain) || 0
			: Number(publicPlan.route.elevation_gain) || 0;
		const loss = route
			? Number(route.elevation_loss) || 0
			: Number(publicPlan.route.elevation_loss) || 0;
		const name = publicPlan.route.name || route?.name || "경로";
		const rwgpsUrl =
			publicPlan.route.rwgps_url ||
			(route != null ? `https://ridewithgps.com/routes/${route.id}` : "");
		return {
			name,
			rwgpsUrl,
			distanceMeters: distanceM,
			elevationGain: gain,
			elevationLoss: loss,
		};
	}, [publicPlan, route]);

	const handlePin = (index: number) => {
		setPositionIndex(index);
		setIsPinned(true);
	};

	const handleUnpin = () => {
		setIsPinned(false);
	};

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
				<div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-zinc-800">
					<svg
						className="h-5 w-5 animate-spin text-orange-500"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
					<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
						공유 플랜 불러오는 중...
					</span>
				</div>
			</div>
		);
	}

	if (error || !publicPlan) {
		return (
			<div className="flex h-full items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-800">
				<div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400">
					{error ?? "공유 플랜을 찾을 수 없습니다."}
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1">
			{isMemoReviewOpen ? (
				<div className="hidden shrink-0 lg:flex">
					<MemoReviewPane
						stages={stages}
						planStartDate={publicPlan.plan.start_date}
						onClose={() => setIsMemoReviewOpen(false)}
						readOnly
					/>
				</div>
			) : (
				<aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
					<div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
						{publicRouteSummary ? (
							<RouteSummaryBlock
								name={publicRouteSummary.name}
								rwgpsUrl={publicRouteSummary.rwgpsUrl}
								distanceMeters={publicRouteSummary.distanceMeters}
								elevationGain={publicRouteSummary.elevationGain}
								elevationLoss={publicRouteSummary.elevationLoss}
							/>
						) : null}
						<h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
							{publicPlan.plan.name}
						</h3>
						{publicPlan.author?.nickname ? (
							<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
								작성 · {publicPlan.author.nickname}
							</p>
						) : null}
						<div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
							<span>{stages.length}일 계획</span>
						</div>
						<button
							type="button"
							onClick={() => setIsMemoReviewOpen(true)}
							className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
						>
							<BookOpenIcon className="h-3.5 w-3.5" />
							메모 리뷰
						</button>
					</div>
					<div className="space-y-2 p-4">
						{stages.map((stage) => {
							const color = getStageColor(stage.dayNumber);
							const isActive = activeStageId === stage.id;
							return (
								<div
									key={stage.id}
									className={`rounded-lg border p-3 transition-colors ${
										isActive
											? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800"
											: "border-zinc-200 dark:border-zinc-700"
									}`}
									onMouseEnter={() => setActiveStageId(stage.id)}
									onMouseLeave={() => setActiveStageId(null)}
								>
									<div className="flex items-center gap-2">
										<div
											className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
											style={{ backgroundColor: color.stroke }}
										>
											{stage.dayNumber}
										</div>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
												스테이지 {stage.dayNumber}
											</p>
											{publicPlan.plan.start_date && (
												<p className="text-xs text-zinc-500 dark:text-zinc-400">
													{stageDayLabel(stage.dayNumber, publicPlan.plan.start_date)}
												</p>
											)}
										</div>
									</div>
									<div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
										거리 {stage.distanceKm.toFixed(1)}km / 상승{" "}
										{Math.round(stage.elevationGain)}m
									</div>
									{stage.memo && (
										<p className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
											{stage.memo}
										</p>
									)}
								</div>
							);
						})}
					</div>
					<div className="mt-auto border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
						미계획 구간 {unplannedDistanceKm.toFixed(1)}km
					</div>
				</aside>
			)}

			<div className="flex min-h-0 flex-1 flex-col">
				<section className="relative min-h-0 flex-1">
					<KakaoMap
						route={route}
						stages={stages}
						activeStageId={activeStageId}
						onStageHover={setActiveStageId}
						highlightPosition={
							positionIndex != null && route?.track_points?.[positionIndex]
								? [route.track_points[positionIndex].y, route.track_points[positionIndex].x]
								: null
						}
						onPositionChange={setPositionIndex}
						trackPoints={route?.track_points ?? []}
						isPinned={isPinned}
						onPin={handlePin}
						onUnpin={handleUnpin}
						reviewContext={{ routeId: "", planId: null, stageId: null }}
					/>
				</section>

				<section className="hidden h-40 shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
					<ElevationProfile
						trackPoints={route?.track_points ?? []}
						stages={stages}
						activeStageId={activeStageId}
						positionIndex={positionIndex}
						onPositionChange={setPositionIndex}
						selectedDayNumber={effectiveSelectedDay}
						onSelectedDayChange={(day) => setSelectedDayNumber(day)}
						isPinned={isPinned}
						onPin={handlePin}
					/>
				</section>
			</div>
		</div>
	);
}
