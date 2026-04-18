"use client";

import { calibrateThreshold, computeTrackElevationGainLoss } from "@my-ridings/plan-geometry";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrackPoint } from "../components/KakaoMap";
import type { Stage } from "../types/plan";

export {
	calibrateThreshold,
	computeElevationGainCurve,
	computeTrackElevationGainLoss,
} from "@my-ridings/plan-geometry";

// ── 헬퍼 ─────────────────────────────────────────────────────────

let nextId = 1;
function generateId(): string {
	return `stage-${nextId++}`;
}

// ── 경계 미리보기 상태 ──────────────────────────────────────────
export type PendingStageEdit = {
	stageId: string;
	originalEndKm: number;
	previewEndKm: number;
};

// ── 삭제 확인 상태 ──────────────────────────────────────────────
export interface PendingDeletion {
	stageId: string;
	stageDayNumber: number;
	/** 다음 Stage가 0 이하가 되어 삭제가 필요 */
	type: "next-stage-zero";
	nextStageId: string;
	nextStageDayNumber: number;
}

export interface DeleteConfirmation {
	stageId: string;
	stageDayNumber: number;
	distanceKm: number;
	/** 첫번째/마지막은 방향이 고정, 중간은 사용자 선택 */
	mergeOptions: ("prev" | "next")[];
}

// ── Hook ────────────────────────────────────────────────────────

export function usePlanStages(
	trackPoints: TrackPoint[],
	knownTotalGainM: number = 0,
	initialStages: Stage[] = [],
	planId: string | null = null,
) {
	const [stages, setStages] = useState<Stage[]>(initialStages);
	const [activeStageId, setActiveStageId] = useState<string | null>(null);
	const [pendingDeletion, setPendingDeletion] =
		useState<PendingDeletion | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] =
		useState<DeleteConfirmation | null>(null);
	const [pendingStageEdit, setPendingStageEdit] =
		useState<PendingStageEdit | null>(null);

	// Sync API Data
	useEffect(() => {
		setStages(initialStages);
	}, [initialStages]);

	// 플랜 전환 시 편집/삭제 대기 상태 초기화
	useEffect(() => {
		setPendingStageEdit(null);
		setPendingDeletion(null);
		setDeleteConfirmation(null);
	}, [planId]);

	// 총 경로 거리 (km)
	const totalRouteDistanceKm =
		trackPoints.length === 0
			? 0
			: (trackPoints[trackPoints.length - 1].d ?? 0) / 1000;

	// 아직 Stage에 할당되지 않은 남은 거리
	const unplannedDistanceKm =
		stages.length === 0
			? totalRouteDistanceKm
			: Math.max(
					0,
					totalRouteDistanceKm - stages[stages.length - 1].endDistanceKm,
				);

	// ── 캘리브레이션: RideWithGPS elevation_gain을 목표로 threshold를 한 번만 계산
	const calibratedThreshold = useMemo(() => {
		if (trackPoints.length === 0 || knownTotalGainM <= 0) return 0;
		return calibrateThreshold(trackPoints, knownTotalGainM);
	}, [trackPoints, knownTotalGainM]);

	// Stage 배열 재계산: dayNumber, startDistanceKm, endDistanceKm 재정렬
	const rebuildStages = useCallback(
		(rawStages: Stage[]): Stage[] => {
			let cursor = 0;
			return rawStages.map((s, i) => {
				const startKm = cursor;
				const endKm = cursor + s.distanceKm;
				const elev = computeTrackElevationGainLoss(
					trackPoints,
					startKm,
					endKm,
					calibratedThreshold,
				);
				cursor = endKm;
				return {
					...s,
					dayNumber: i + 1,
					startDistanceKm: startKm,
					endDistanceKm: endKm,
					elevationGain: elev.gain,
					elevationLoss: elev.loss,
					isLastStage: s.isLastStage,
				};
			});
		},
		[trackPoints, calibratedThreshold],
	);

	// ── Stage 추가 ───────────────────────────────────────────────
	const addStage = useCallback(
		(distanceKm: number) => {
			if (distanceKm <= 0) return;
			if (distanceKm > unplannedDistanceKm) return;

			const startKm = stages.length > 0 ? stages[stages.length - 1].endDistanceKm : 0;
			const endKm = startKm + distanceKm;
			const elev = computeTrackElevationGainLoss(trackPoints, startKm, endKm, calibratedThreshold);

			const newStage: Stage = {
				id: `temp-${generateId()}`,
				dayNumber: stages.length + 1,
				distanceKm,
				startDistanceKm: startKm,
				endDistanceKm: endKm,
				elevationGain: elev.gain,
				elevationLoss: elev.loss,
				isLastStage: false,
			};

			setStages((prev) => [...prev, newStage]);

			if (planId) {
				fetch("/api/stages", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						plan_id: planId,
						title: `Stage ${newStage.dayNumber}`,
						start_distance: newStage.startDistanceKm * 1000,
						end_distance: newStage.endDistanceKm * 1000,
						elevation_gain: newStage.elevationGain,
						elevation_loss: newStage.elevationLoss,
					}),
				})
					.then((res) => res.json())
					.then((data) => {
						if (data.id) {
							setStages((current) =>
								current.map((s) => (s.id === newStage.id ? { ...s, id: data.id } : s)),
							);
						}
					})
					.catch(console.error);
			}
		},
		[stages, trackPoints, unplannedDistanceKm, calibratedThreshold, planId],
	);

	// ── 마지막 Stage ("목적지까지") ─────────────────────────────
	const addLastStage = useCallback(() => {
		if (unplannedDistanceKm <= 0) return;

		const startKm = stages.length > 0 ? stages[stages.length - 1].endDistanceKm : 0;
		const endKm = totalRouteDistanceKm;
		const distanceKm = endKm - startKm;
		const elev = computeTrackElevationGainLoss(trackPoints, startKm, endKm, calibratedThreshold);

		const newStage: Stage = {
			id: `temp-${generateId()}`,
			dayNumber: stages.length + 1,
			distanceKm: Math.round(distanceKm * 10) / 10,
			startDistanceKm: startKm,
			endDistanceKm: endKm,
			elevationGain: elev.gain,
			elevationLoss: elev.loss,
			isLastStage: true,
		};

		setStages((prev) => [...prev, newStage]);

		if (planId) {
			fetch("/api/stages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					plan_id: planId,
					title: `Stage ${newStage.dayNumber}`,
					start_distance: newStage.startDistanceKm * 1000,
					end_distance: newStage.endDistanceKm * 1000,
					elevation_gain: newStage.elevationGain,
					elevation_loss: newStage.elevationLoss,
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.id) {
						setStages((current) =>
							current.map((s) => (s.id === newStage.id ? { ...s, id: data.id } : s)),
						);
					}
				})
				.catch(console.error);
		}
	}, [stages, trackPoints, totalRouteDistanceKm, unplannedDistanceKm, calibratedThreshold, planId]);

	// ── Stage 거리 수정 ─────────────────────────────────────────
	type UpdateStageOptions = { skipApiSync?: boolean };
	const updateStageDistance = useCallback(
		(
			stageId: string,
			newDistanceKm: number,
			options?: UpdateStageOptions,
		) => {
			if (newDistanceKm <= 0) return;

			const idx = stages.findIndex((s) => s.id === stageId);
			if (idx === -1) return;

			const oldStage = stages[idx];
			const diff = newDistanceKm - oldStage.distanceKm;
			const skipApi = options?.skipApiSync ?? false;

			// 마지막 Stage인 경우: 미계획 구간에서 가감
			if (idx === stages.length - 1) {
				const newUnplanned = unplannedDistanceKm - diff;
				if (newUnplanned < -0.01) return; // 전체 거리 초과

				const updated = [...stages];
				updated[idx] = { ...oldStage, distanceKm: newDistanceKm };
				const newStages = rebuildStages(updated);
				setStages(newStages);

				if (!skipApi && planId && !oldStage.id.startsWith("temp-")) {
					const st = newStages[idx];
					fetch(`/api/stages/${oldStage.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							start_distance: st.startDistanceKm * 1000,
							end_distance: st.endDistanceKm * 1000,
							elevation_gain: st.elevationGain,
							elevation_loss: st.elevationLoss,
						}),
					}).catch(console.error);
				}
				return;
			}

			// 중간 Stage인 경우: 다음 Stage 거리 조정
			const nextStage = stages[idx + 1];
			const nextNewDistance = Math.round((nextStage.distanceKm - diff) * 10) / 10;

			if (nextNewDistance <= 0) {
				// 다음 Stage가 0 이하 → 삭제 확인 필요
				setPendingDeletion({
					stageId,
					stageDayNumber: oldStage.dayNumber,
					type: "next-stage-zero",
					nextStageId: nextStage.id,
					nextStageDayNumber: nextStage.dayNumber,
				});
				return; // 아직 적용하지 않음
			}

			const updated = [...stages];
			updated[idx] = { ...oldStage, distanceKm: newDistanceKm };
			updated[idx + 1] = { ...nextStage, distanceKm: nextNewDistance };
			const newStages = rebuildStages(updated);
			setStages(newStages);

			if (!skipApi && planId) {
				if (!oldStage.id.startsWith("temp-")) {
					const st = newStages[idx];
					fetch(`/api/stages/${oldStage.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							start_distance: st.startDistanceKm * 1000,
							end_distance: st.endDistanceKm * 1000,
							elevation_gain: st.elevationGain,
							elevation_loss: st.elevationLoss,
						}),
					}).catch(console.error);
				}
				if (!nextStage.id.startsWith("temp-")) {
					const st = newStages[idx + 1];
					fetch(`/api/stages/${nextStage.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							start_distance: st.startDistanceKm * 1000,
							end_distance: st.endDistanceKm * 1000,
							elevation_gain: st.elevationGain,
							elevation_loss: st.elevationLoss,
						}),
					}).catch(console.error);
				}
			}
		},
		[stages, rebuildStages, unplannedDistanceKm, planId],
	);

	// ── 다음 Stage 삭제 확인 (거리 수정으로 인한) ─────────────────
	const confirmNextStageDeletion = useCallback(
		(newDistanceKm: number) => {
			if (!pendingDeletion) return;

			const idx = stages.findIndex((s) => s.id === pendingDeletion.stageId);
			if (idx === -1) return;

			const updated = [...stages];
			updated[idx] = { ...updated[idx], distanceKm: newDistanceKm };
			const nextStageId = updated[idx + 1].id;
			updated.splice(idx + 1, 1);
			const newStages = rebuildStages(updated);
			setStages(newStages);

			if (planId) {
				if (!nextStageId.startsWith("temp-")) {
					fetch(`/api/stages/${nextStageId}`, { method: "DELETE" }).catch(console.error);
				}
				if (!stages[idx].id.startsWith("temp-")) {
					const st = newStages[idx];
					fetch(`/api/stages/${stages[idx].id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							start_distance: st.startDistanceKm * 1000,
							end_distance: st.endDistanceKm * 1000,
							elevation_gain: st.elevationGain,
							elevation_loss: st.elevationLoss,
						}),
					}).catch(console.error);
				}
			}
			setPendingDeletion(null);
		},
		[stages, pendingDeletion, rebuildStages, planId],
	);

	const cancelPendingDeletion = () => setPendingDeletion(null);

	// ── 경계 미리보기 (커밋 전 드래그) ────────────────────────────
	const startBoundaryPreview = (stageId: string) => {
		const stage = stages.find((s) => s.id === stageId);
		if (!stage || stage.endDistanceKm >= totalRouteDistanceKm - 0.01) return;
		setPendingStageEdit({
			stageId,
			originalEndKm: stage.endDistanceKm,
			previewEndKm: stage.endDistanceKm,
		});
	};

	const updatePreviewEndKm = (km: number) => {
		setPendingStageEdit((prev) => {
			if (!prev) return prev;
			const idx = stages.findIndex((s) => s.id === prev.stageId);
			const stage = stages[idx];
			if (!stage) return prev;
			const minKm = stage.startDistanceKm + 0.1;
			const nextStage = stages[idx + 1];
			const maxKm = nextStage
				? nextStage.endDistanceKm - 0.1
				: totalRouteDistanceKm;
			const clamped = Math.max(minKm, Math.min(maxKm, km));
			return { ...prev, previewEndKm: clamped };
		});
	};

	const commitPreview = () => {
		if (!pendingStageEdit) return;
		const { stageId, previewEndKm } = pendingStageEdit;
		const stage = stages.find((s) => s.id === stageId);
		if (!stage) return;
		const newDistanceKm =
			Math.round((previewEndKm - stage.startDistanceKm) * 10) / 10;
		updateStageDistance(stageId, newDistanceKm);
		setPendingStageEdit(null);
	};

	const discardPreview = () => setPendingStageEdit(null);

	const previewStageStats = useMemo(() => {
		if (!pendingStageEdit) return null;
		const stage = stages.find((s) => s.id === pendingStageEdit.stageId);
		if (!stage) return null;
		const distanceKm = Math.round(
			(pendingStageEdit.previewEndKm - stage.startDistanceKm) * 10,
		) / 10;
		const { gain, loss } = computeTrackElevationGainLoss(
			trackPoints,
			stage.startDistanceKm,
			pendingStageEdit.previewEndKm,
			calibratedThreshold,
		);
		return { distanceKm, elevationGain: gain, elevationLoss: loss };
	}, [stages, pendingStageEdit, trackPoints, calibratedThreshold]);

	// ── Stage 삭제 요청 ─────────────────────────────────────────
	const requestDeleteStage = useCallback(
		(stageId: string) => {
			const idx = stages.findIndex((s) => s.id === stageId);
			if (idx === -1) return;

			const stage = stages[idx];

			// 첫번째 Stage → 자동으로 다음에 합산
			if (idx === 0 && stages.length > 1) {
				const updated = [...stages];
				updated[1] = { ...updated[1], distanceKm: updated[1].distanceKm + stage.distanceKm };
				const nextStageId = updated[1].id;
				updated.splice(0, 1);
				const newStages = rebuildStages(updated);
				setStages(newStages);

				if (planId) {
					if (!stage.id.startsWith("temp-")) {
						fetch(`/api/stages/${stage.id}`, { method: "DELETE" }).catch(console.error);
					}
					if (!nextStageId.startsWith("temp-")) {
						const st = newStages[0];
						fetch(`/api/stages/${nextStageId}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								start_distance: st.startDistanceKm * 1000,
								end_distance: st.endDistanceKm * 1000,
								elevation_gain: st.elevationGain,
								elevation_loss: st.elevationLoss,
							}),
						}).catch(console.error);
					}
				}
				return;
			}

			// 마지막 Stage → 자동으로 미계획으로 반환 (이전 Stage에 합산 X)
			if (idx === stages.length - 1) {
				const updated = [...stages];
				updated.splice(idx, 1);
				const newStages = rebuildStages(updated);
				setStages(newStages);

				if (planId && !stage.id.startsWith("temp-")) {
					fetch(`/api/stages/${stage.id}`, { method: "DELETE" }).catch(console.error);
				}
				return;
			}

			// 중간 Stage → 사용자에게 선택 요청
			setDeleteConfirmation({
				stageId,
				stageDayNumber: stage.dayNumber,
				distanceKm: stage.distanceKm,
				mergeOptions: ["prev", "next"],
			});
		},
		[stages, rebuildStages, planId],
	);

	// ── Stage 삭제 실행 (방향 선택 후) ──────────────────────────
	const executeDeleteStage = useCallback(
		(stageId: string, mergeDirection: "prev" | "next") => {
			const idx = stages.findIndex((s) => s.id === stageId);
			if (idx === -1) return;

			const stage = stages[idx];
			const updated = [...stages];

			if (mergeDirection === "prev" && idx > 0) {
				updated[idx - 1] = {
					...updated[idx - 1],
					distanceKm: updated[idx - 1].distanceKm + stage.distanceKm,
				};
			} else if (mergeDirection === "next" && idx < stages.length - 1) {
				updated[idx + 1] = {
					...updated[idx + 1],
					distanceKm: updated[idx + 1].distanceKm + stage.distanceKm,
				};
			}

			updated.splice(idx, 1);
			const newStages = rebuildStages(updated);
			setStages(newStages);

			if (planId) {
				if (!stage.id.startsWith("temp-")) {
					fetch(`/api/stages/${stage.id}`, { method: "DELETE" }).catch(console.error);
				}
				const neighborIdx = mergeDirection === "prev" ? idx - 1 : idx;
				const neighborStage = newStages[neighborIdx];

				if (neighborStage && !neighborStage.id.startsWith("temp-")) {
					fetch(`/api/stages/${neighborStage.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							start_distance: neighborStage.startDistanceKm * 1000,
							end_distance: neighborStage.endDistanceKm * 1000,
							elevation_gain: neighborStage.elevationGain,
							elevation_loss: neighborStage.elevationLoss,
						}),
					}).catch(console.error);
				}
			}
			setDeleteConfirmation(null);
		},
		[stages, rebuildStages, planId],
	);

	const cancelDeleteConfirmation = () => setDeleteConfirmation(null);

	const updateStageMeta = useCallback(
		(
			stageId: string,
			patch: {
				memo?: string;
				startName?: string;
				endName?: string;
			},
		) => {
			setStages((prev) =>
				prev.map((s) => {
					if (s.id !== stageId) return s;
					return {
						...s,
						...(patch.memo !== undefined
							? { memo: patch.memo.trim() ? patch.memo : undefined }
							: {}),
						...(patch.startName !== undefined
							? {
									startName: patch.startName.trim()
										? patch.startName
										: undefined,
								}
							: {}),
						...(patch.endName !== undefined
							? {
									endName: patch.endName.trim() ? patch.endName : undefined,
								}
							: {}),
					};
				}),
			);
		},
		[],
	);

	const updateStageMemo = useCallback(
		(stageId: string, memo: string) => {
			updateStageMeta(stageId, { memo });
		},
		[updateStageMeta],
	);

	return {
		stages,
		activeStageId,
		setActiveStageId,
		totalRouteDistanceKm,
		unplannedDistanceKm,
		calibratedThreshold,

		addStage,
		addLastStage,
		updateStageDistance,

		pendingStageEdit,
		previewStageStats,
		startBoundaryPreview,
		updatePreviewEndKm,
		commitPreview,
		discardPreview,

		pendingDeletion,
		confirmNextStageDeletion,
		cancelPendingDeletion,

		deleteConfirmation,
		requestDeleteStage,
		executeDeleteStage,
		cancelDeleteConfirmation,

		updateStageMemo,
		updateStageMeta,
	};
}
