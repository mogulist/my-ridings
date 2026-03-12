"use client";

import { useEffect, useState } from "react";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import { usePlanStages } from "../hooks/usePlanStages";
import StageCard from "./StageCard";
import AddStageForm from "./AddStageForm";
import {
	PendingDeletionDialog,
	DeleteConfirmationDialog,
} from "./DeleteStageDialog";
import type { Plan, Stage } from "../types/plan";

interface RouteViewerProps {
	routeId: string;
}

function formatDistance(meters: number) {
	return (meters / 1000).toFixed(1) + " km";
}

export default function RouteViewer({ routeId }: RouteViewerProps) {
	const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
	const [dbRoute, setDbRoute] = useState<any>(null);
	const [activePlanId, setActivePlanId] = useState<string | null>(null);
	const [dbStages, setDbStages] = useState<Stage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [newPlanName, setNewPlanName] = useState("");
	const [isCreatingPlan, setIsCreatingPlan] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		// Fetch from DB first to get RWGPS URL and nested plans/stages
		fetch(`/api/routes/${routeId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load route from DB");
				return res.json();
			})
			.then((dbData) => {
				if (cancelled) return;
				setDbRoute(dbData);

				if (dbData.plans && dbData.plans.length > 0) {
					// Select the first plan by default
					const firstPlan = dbData.plans[0];
					setActivePlanId(firstPlan.id);
					setDbStages(
						(firstPlan.stages || []).map((s: any) => ({
							id: s.id,
							dayNumber: parseInt(s.title?.replace("Stage ", "") || "1", 10),
							startDistanceKm: s.start_distance / 1000,
							endDistanceKm: s.end_distance / 1000,
							distanceKm: (s.end_distance - s.start_distance) / 1000,
							elevationGain: Number(s.elevation_gain) || 0,
							elevationLoss: Number(s.elevation_loss) || 0,
							isLastStage: false,
						})),
					);
				}

				// Extract RWGPS ID from dbData.rwgps_url
				const match = dbData.rwgps_url.match(/\/routes\/(\d+)/);
				const rwgpsId = match ? match[1] : null;

				if (!rwgpsId) throw new Error("Invalid RWGPS URL in database");

				return fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
			})
			.then((res) => {
				if (!res) return;
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<RideWithGPSRoute>;
			})
			.then((data) => {
				if (!cancelled && data) setRoute(data);
			})
			.catch((err) => {
				if (!cancelled) setError(String(err));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleCreatePlan = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPlanName.trim()) return;
		setIsCreatingPlan(true);

		try {
			const res = await fetch("/api/plans", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ route_id: routeId, name: newPlanName }),
			});
			if (!res.ok) throw new Error("Plan creation failed");
			const newPlan = await res.json();
			
			setDbRoute((prev: any) => ({
				...prev,
				plans: [...(prev?.plans || []), { ...newPlan, stages: [] }],
			}));
			setActivePlanId(newPlan.id);
			setDbStages([]);
			setNewPlanName("");
		} catch (error) {
			console.error(error);
			alert("플랜 생성에 실패했습니다.");
		} finally {
			setIsCreatingPlan(false);
		}
	};

	const {
		stages,
		activeStageId,
		setActiveStageId,
		totalRouteDistanceKm,
		unplannedDistanceKm,

		addStage,
		addLastStage,
		updateStageDistance,

		pendingDeletion,
		confirmNextStageDeletion,
		cancelPendingDeletion,

		deleteConfirmation,
		requestDeleteStage,
		executeDeleteStage,
		cancelDeleteConfirmation,
	} = usePlanStages(
		route?.track_points ?? [],
		route?.elevation_gain ?? 0,
		dbStages, // Pass initial stages loaded from DB
		activePlanId, // Pass active plan ID to let hook sync updates with API
	);

	return (
		<>
			{/* ── 좌측 사이드바 ── */}
			<aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
				<div className="space-y-4 p-4">
					{loading ? (
						<div className="flex items-center gap-2">
							<svg
								className="h-4 w-4 animate-spin text-orange-500"
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
							<span className="text-sm text-zinc-500">
								경로 불러오는 중…
							</span>
						</div>
					) : error ? (
						<p className="text-sm text-red-500">{error}</p>
					) : route ? (
						<>
							{/* 경로 정보 */}
							<div>
								<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
									{dbRoute?.name || route.name}
								</h2>
								<a
									href={dbRoute?.rwgps_url || `https://ridewithgps.com/routes/${route.id}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-orange-500 hover:underline"
								>
									RideWithGPS에서 보기 ↗
								</a>
							</div>
							<div className="flex gap-4 text-sm">
								<div>
									<span className="text-zinc-500 dark:text-zinc-400">
										거리
									</span>
									<p className="font-medium">
										{formatDistance(route.distance)}
									</p>
								</div>
								<div>
									<span className="text-zinc-500 dark:text-zinc-400">
										획득고도
									</span>
									<p className="font-medium text-green-600">
										+{route.elevation_gain.toFixed(0)} m
									</p>
								</div>
								<div>
									<span className="text-zinc-500 dark:text-zinc-400">
										하강고도
									</span>
									<p className="font-medium text-red-500">
										-{route.elevation_loss.toFixed(0)} m
									</p>
								</div>
							</div>

							{/* 구분선 */}
							<hr className="border-zinc-200 dark:border-zinc-700" />

							{/* 계획 헤더 */}
							<div className="flex items-center justify-between mt-4">
								<h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
									📋 라이딩 플랜
								</h3>
							</div>

							{/* 플랜 선택 및 생성 */}
							<div className="space-y-3">
								{dbRoute?.plans?.length > 0 ? (
									<select
										className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
										value={activePlanId || ""}
										onChange={(e) => {
											const planId = e.target.value;
											setActivePlanId(planId);
											const plan = dbRoute.plans.find((p: any) => p.id === planId);
											if (plan) {
												setDbStages(
													(plan.stages || []).map((s: any) => ({
														id: s.id,
														dayNumber: parseInt(s.title?.replace("Stage ", "") || "1", 10),
														startDistanceKm: s.start_distance / 1000,
														endDistanceKm: s.end_distance / 1000,
														distanceKm: (s.end_distance - s.start_distance) / 1000,
														elevationGain: Number(s.elevation_gain) || 0,
														elevationLoss: Number(s.elevation_loss) || 0,
														isLastStage: false,
													})),
												);
											}
										}}
									>
										<option value="" disabled>플랜을 선택하세요</option>
										{dbRoute.plans.map((p: any) => (
											<option key={p.id} value={p.id}>{p.name}</option>
										))}
									</select>
								) : (
									<p className="text-xs text-zinc-500">생성된 플랜이 없습니다.</p>
								)}

								<form onSubmit={handleCreatePlan} className="flex gap-2">
									<input
										type="text"
										className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
										placeholder="새 플랜 이름 (예: 4박 5일 정주행)"
										value={newPlanName}
										onChange={(e) => setNewPlanName(e.target.value)}
									/>
									<button
										type="submit"
										disabled={isCreatingPlan || !newPlanName.trim()}
										className="rounded bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
									>
										추가
									</button>
								</form>
							</div>

							<hr className="border-zinc-200 dark:border-zinc-700" />

							{activePlanId && (
								<>
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
											🏁 스테이지
										</h3>
										{stages.length > 0 && (
											<span className="text-xs text-zinc-400 dark:text-zinc-500">
												{stages.length}일 계획
											</span>
										)}
									</div>

									{/* Stage 카드 목록 */}
									<div className="space-y-2">
										{stages.map((stage, idx) => {
									// 최대 수정 가능 거리: 현재 거리 + 다음 Stage 거리 (마지막이면 + 미계획)
									const nextStage = stages[idx + 1];
									const maxDist = nextStage
										? stage.distanceKm +
											nextStage.distanceKm -
											0.1
										: stage.distanceKm +
											unplannedDistanceKm;

									return (
										<StageCard
											key={stage.id}
											stage={stage}
											isActive={
												activeStageId === stage.id
											}
											onHover={setActiveStageId}
											onUpdateDistance={
												updateStageDistance
											}
											onDelete={requestDeleteStage}
											maxDistanceKm={maxDist}
										/>
									);
								})}
							</div>

							{/* Stage 추가 폼 */}
							<AddStageForm
								unplannedDistanceKm={unplannedDistanceKm}
								onAddStage={addStage}
								onAddLastStage={addLastStage}
								nextDayNumber={stages.length + 1}
							/>

							{/* 전체 진행률 */}
							{stages.length > 0 && (
								<div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
									<div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
										<span>계획 진행률</span>
										<span>
											{(
												((totalRouteDistanceKm -
													unplannedDistanceKm) /
													totalRouteDistanceKm) *
												100
											).toFixed(0)}
											%
										</span>
									</div>
									<div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
										<div
											className="h-full rounded-full bg-blue-500 transition-all"
											style={{
												width: `${((totalRouteDistanceKm - unplannedDistanceKm) / totalRouteDistanceKm) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
								</>
							)}
						</>
					) : null}
				</div>
			</aside>

			{/* ── 오른쪽 컬럼: 지도 + 고도 프로필 ── */}
			<div className="flex min-h-0 flex-1 flex-col">
				{/* 지도 */}
				<section className="relative min-h-0 flex-1">
					{loading && (
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
									경로 불러오는 중…
								</span>
							</div>
						</div>
					)}
					{!loading && (
						<KakaoMap
							route={route}
							stages={stages}
							activeStageId={activeStageId}
							onStageHover={setActiveStageId}
						/>
					)}
				</section>

				{/* 고도 프로필 */}
				<section className="hidden h-40 shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
					<ElevationProfile
						trackPoints={route?.track_points ?? []}
						stages={stages}
						activeStageId={activeStageId}
					/>
				</section>
			</div>

			{/* ── 다이얼로그 ── */}
			{pendingDeletion && (
				<PendingDeletionDialog
					pending={pendingDeletion}
					onConfirm={() => {
						// 현재 Stage의 거리를 다음 Stage 시작까지로 확장
						const stageIdx = stages.findIndex(
							(s) => s.id === pendingDeletion.stageId,
						);
						if (stageIdx !== -1) {
							const currentStage = stages[stageIdx];
							const nextStage = stages[stageIdx + 1];
							if (nextStage) {
								confirmNextStageDeletion(
									currentStage.distanceKm +
										nextStage.distanceKm,
								);
							}
						}
					}}
					onCancel={cancelPendingDeletion}
				/>
			)}

			{deleteConfirmation && (
				<DeleteConfirmationDialog
					confirmation={deleteConfirmation}
					onExecute={executeDeleteStage}
					onCancel={cancelDeleteConfirmation}
				/>
			)}
		</>
	);
}
