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

const ROUTE_ID = "52263710";

function formatDistance(meters: number) {
	return (meters / 1000).toFixed(1) + " km";
}

export default function RouteViewer() {
	const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		fetch(`/api/ridewithgps?routeId=${ROUTE_ID}`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<RideWithGPSRoute>;
			})
			.then((data) => {
				if (!cancelled) setRoute(data);
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
	} = usePlanStages(route?.track_points ?? []);

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
									{route.name}
								</h2>
								<a
									href={`https://ridewithgps.com/routes/${route.id}`}
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
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
									📋 라이딩 계획
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
