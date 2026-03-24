"use client";

import { useEffect, useMemo, useState } from "react";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import { type Stage } from "../types/plan";
import { PlanStagesPane } from "./PlanStagesPane";

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
	const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
	const [memoExpandedStageIds, setMemoExpandedStageIds] = useState<Set<string>>(
		() => new Set()
	);

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

	const handleToggleMemoExpand = (stageId: string) => {
		setMemoExpandedStageIds((prev) => {
			const next = new Set(prev);
			if (next.has(stageId)) next.delete(stageId);
			else next.add(stageId);
			return next;
		});
	};

	const handleExpandAllMemos = () => {
		setMemoExpandedStageIds(new Set(stages.map((stage) => stage.id)));
	};

	const handleCollapseAllMemos = () => {
		setMemoExpandedStageIds(new Set());
	};

	const noopUpdateStageDistance = () => {};
	const noopRequestDeleteStage = () => {};
	const noopAddStage = () => {};
	const noopAddLastStage = () => {};

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
			<aside className="hidden shrink-0 lg:flex">
				<PlanStagesPane
					planName={publicPlan.plan.name}
					planId={null}
					planStartDate={publicPlan.plan.start_date}
					stages={stages}
					activeStageId={activeStageId}
					setActiveStageId={setActiveStageId}
					totalRouteDistanceKm={totalRouteDistanceKm}
					unplannedDistanceKm={unplannedDistanceKm}
					updateStageDistance={noopUpdateStageDistance}
					requestDeleteStage={noopRequestDeleteStage}
					addStage={noopAddStage}
					addLastStage={noopAddLastStage}
					memoExpandedStageIds={memoExpandedStageIds}
					onToggleMemoExpand={handleToggleMemoExpand}
					onExpandAllMemos={handleExpandAllMemos}
					onCollapseAllMemos={handleCollapseAllMemos}
					readOnly
				/>
			</aside>

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
					/>
				</section>
			</div>
		</div>
	);
}
