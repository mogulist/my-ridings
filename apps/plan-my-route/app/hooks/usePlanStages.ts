"use client";

import { useCallback, useMemo, useState } from "react";
import type { TrackPoint } from "../components/KakaoMap";
import type { Stage } from "../types/plan";

// ── 헬퍼 ─────────────────────────────────────────────────────────

let nextId = 1;
function generateId(): string {
	return `stage-${nextId++}`;
}

/** track_points 에서 startKm ~ endKm 구간의 획득/하강 고도를 계산 */
function computeElevation(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
): { gain: number; loss: number } {
	const startM = startKm * 1000;
	const endM = endKm * 1000;

	let gain = 0;
	let loss = 0;
	let started = false;

	for (let i = 1; i < trackPoints.length; i++) {
		const prev = trackPoints[i - 1];
		const curr = trackPoints[i];
		if (prev.d == null || curr.d == null || prev.e == null || curr.e == null)
			continue;

		// 구간 내 포인트만 계산
		if (curr.d < startM) continue;
		if (curr.d > endM) break;

		if (!started) {
			started = true;
			continue; // 첫 포인트는 비교대상 없음
		}

		const diff = curr.e - prev.e;
		if (diff > 0) gain += diff;
		else loss += Math.abs(diff);
	}

	return { gain: Math.round(gain), loss: Math.round(loss) };
}

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

export function usePlanStages(trackPoints: TrackPoint[]) {
	const [stages, setStages] = useState<Stage[]>([]);
	const [activeStageId, setActiveStageId] = useState<string | null>(null);
	const [pendingDeletion, setPendingDeletion] =
		useState<PendingDeletion | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] =
		useState<DeleteConfirmation | null>(null);

	// 총 경로 거리 (km)
	const totalRouteDistanceKm = useMemo(() => {
		if (trackPoints.length === 0) return 0;
		const last = trackPoints[trackPoints.length - 1];
		return last.d != null ? last.d / 1000 : 0;
	}, [trackPoints]);

	// 아직 Stage에 할당되지 않은 남은 거리
	const unplannedDistanceKm = useMemo(() => {
		if (stages.length === 0) return totalRouteDistanceKm;
		const lastStage = stages[stages.length - 1];
		return Math.max(0, totalRouteDistanceKm - lastStage.endDistanceKm);
	}, [stages, totalRouteDistanceKm]);

	// Stage 배열 재계산: dayNumber, startDistanceKm, endDistanceKm 재정렬
	const rebuildStages = useCallback(
		(rawStages: Stage[]): Stage[] => {
			let cursor = 0;
			return rawStages.map((s, i) => {
				const startKm = cursor;
				const endKm = cursor + s.distanceKm;
				const elev = computeElevation(trackPoints, startKm, endKm);
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
		[trackPoints],
	);

	// ── Stage 추가 ───────────────────────────────────────────────
	const addStage = useCallback(
		(distanceKm: number) => {
			if (distanceKm <= 0) return;
			if (distanceKm > unplannedDistanceKm) return;

			setStages((prev) => {
				const startKm =
					prev.length > 0 ? prev[prev.length - 1].endDistanceKm : 0;
				const endKm = startKm + distanceKm;
				const elev = computeElevation(trackPoints, startKm, endKm);

				const newStage: Stage = {
					id: generateId(),
					dayNumber: prev.length + 1,
					distanceKm,
					startDistanceKm: startKm,
					endDistanceKm: endKm,
					elevationGain: elev.gain,
					elevationLoss: elev.loss,
					isLastStage: false,
				};
				return [...prev, newStage];
			});
		},
		[trackPoints, unplannedDistanceKm],
	);

	// ── 마지막 Stage ("목적지까지") ─────────────────────────────
	const addLastStage = useCallback(() => {
		if (unplannedDistanceKm <= 0) return;

		setStages((prev) => {
			const startKm =
				prev.length > 0 ? prev[prev.length - 1].endDistanceKm : 0;
			const endKm = totalRouteDistanceKm;
			const distanceKm = endKm - startKm;
			const elev = computeElevation(trackPoints, startKm, endKm);

			const newStage: Stage = {
				id: generateId(),
				dayNumber: prev.length + 1,
				distanceKm: Math.round(distanceKm * 10) / 10,
				startDistanceKm: startKm,
				endDistanceKm: endKm,
				elevationGain: elev.gain,
				elevationLoss: elev.loss,
				isLastStage: true,
			};
			return [...prev, newStage];
		});
	}, [trackPoints, totalRouteDistanceKm, unplannedDistanceKm]);

	// ── Stage 거리 수정 ─────────────────────────────────────────
	const updateStageDistance = useCallback(
		(stageId: string, newDistanceKm: number) => {
			if (newDistanceKm <= 0) return;

			setStages((prev) => {
				const idx = prev.findIndex((s) => s.id === stageId);
				if (idx === -1) return prev;

				const oldStage = prev[idx];
				const diff = newDistanceKm - oldStage.distanceKm;

				// 마지막 Stage인 경우: 미계획 구간에서 가감
				if (idx === prev.length - 1) {
					const newUnplanned = unplannedDistanceKm - diff;
					if (newUnplanned < -0.01) return prev; // 전체 거리 초과
					const updated = [...prev];
					updated[idx] = { ...oldStage, distanceKm: newDistanceKm };
					return rebuildStages(updated);
				}

				// 중간 Stage인 경우: 다음 Stage 거리 조정
				const nextStage = prev[idx + 1];
				const nextNewDistance =
					Math.round((nextStage.distanceKm - diff) * 10) / 10;

				if (nextNewDistance <= 0) {
					// 다음 Stage가 0 이하 → 삭제 확인 필요
					setPendingDeletion({
						stageId,
						stageDayNumber: oldStage.dayNumber,
						type: "next-stage-zero",
						nextStageId: nextStage.id,
						nextStageDayNumber: nextStage.dayNumber,
					});
					return prev; // 아직 적용하지 않음
				}

				const updated = [...prev];
				updated[idx] = { ...oldStage, distanceKm: newDistanceKm };
				updated[idx + 1] = { ...nextStage, distanceKm: nextNewDistance };
				return rebuildStages(updated);
			});
		},
		[rebuildStages, unplannedDistanceKm],
	);

	// ── 다음 Stage 삭제 확인 (거리 수정으로 인한) ─────────────────
	const confirmNextStageDeletion = useCallback(
		(newDistanceKm: number) => {
			if (!pendingDeletion) return;

			setStages((prev) => {
				const idx = prev.findIndex(
					(s) => s.id === pendingDeletion.stageId,
				);
				if (idx === -1) return prev;

				const updated = [...prev];
				updated[idx] = { ...updated[idx], distanceKm: newDistanceKm };
				// 다음 Stage 삭제
				updated.splice(idx + 1, 1);
				return rebuildStages(updated);
			});
			setPendingDeletion(null);
		},
		[pendingDeletion, rebuildStages],
	);

	const cancelPendingDeletion = useCallback(() => {
		setPendingDeletion(null);
	}, []);

	// ── Stage 삭제 요청 ─────────────────────────────────────────
	const requestDeleteStage = useCallback(
		(stageId: string) => {
			const idx = stages.findIndex((s) => s.id === stageId);
			if (idx === -1) return;

			const stage = stages[idx];

			// 첫번째 Stage → 자동으로 다음에 합산
			if (idx === 0 && stages.length > 1) {
				setStages((prev) => {
					const updated = [...prev];
					updated[1] = {
						...updated[1],
						distanceKm: updated[1].distanceKm + stage.distanceKm,
					};
					updated.splice(0, 1);
					return rebuildStages(updated);
				});
				return;
			}

			// 마지막 Stage → 자동으로 미계획으로 반환 (이전 Stage에 합산 X)
			if (idx === stages.length - 1) {
				setStages((prev) => {
					const updated = [...prev];
					updated.splice(idx, 1);
					return rebuildStages(updated);
				});
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
		[stages, rebuildStages],
	);

	// ── Stage 삭제 실행 (방향 선택 후) ──────────────────────────
	const executeDeleteStage = useCallback(
		(stageId: string, mergeDirection: "prev" | "next") => {
			setStages((prev) => {
				const idx = prev.findIndex((s) => s.id === stageId);
				if (idx === -1) return prev;

				const stage = prev[idx];
				const updated = [...prev];

				if (mergeDirection === "prev" && idx > 0) {
					updated[idx - 1] = {
						...updated[idx - 1],
						distanceKm: updated[idx - 1].distanceKm + stage.distanceKm,
					};
				} else if (mergeDirection === "next" && idx < prev.length - 1) {
					updated[idx + 1] = {
						...updated[idx + 1],
						distanceKm: updated[idx + 1].distanceKm + stage.distanceKm,
					};
				}

				updated.splice(idx, 1);
				return rebuildStages(updated);
			});
			setDeleteConfirmation(null);
		},
		[rebuildStages],
	);

	const cancelDeleteConfirmation = useCallback(() => {
		setDeleteConfirmation(null);
	}, []);

	return {
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
	};
}
