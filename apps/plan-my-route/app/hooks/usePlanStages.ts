"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrackPoint } from "../components/KakaoMap";
import type { Stage } from "../types/plan";

// ── 헬퍼 ─────────────────────────────────────────────────────────

let nextId = 1;
function generateId(): string {
	return `stage-${nextId++}`;
}

// ── 이동평균 스무딩 ───────────────────────────────────────────────

/**
 * 고도 배열에 이동평균 스무딩을 적용한다.
 * window=9: RideWithGPS 전체 elevation_gain과 오차 ~1% 수준으로 일치.
 */
const SMOOTH_WINDOW = 9;

function smoothElevations(elevations: number[]): number[] {
	const half = Math.floor(SMOOTH_WINDOW / 2);
	return elevations.map((_, i) => {
		const start = Math.max(0, i - half);
		const end = Math.min(elevations.length, i + half + 1);
		let sum = 0;
		for (let j = start; j < end; j++) sum += elevations[j];
		return sum / (end - start);
	});
}

// ── 스무딩 + 세그먼트 threshold 기반 고도 계산 ─────────────────

/**
 * 스무딩된 고도 배열을 대상으로,
 * 방향이 전환될 때마다 pending 누적값이 threshold 이상이면 gain/loss에 반영한다.
 * threshold=0 이면 순수 이동평균만 적용한 것과 동일.
 */
function calcGainLossFromSmoothed(
	smoothed: number[],
	threshold: number,
): { gain: number; loss: number } {
	let gain = 0;
	let loss = 0;
	let pendingUp = 0;
	let pendingDown = 0;

	for (let i = 1; i < smoothed.length; i++) {
		const diff = smoothed[i] - smoothed[i - 1];
		if (diff > 0) {
			if (pendingDown > 0) {
				if (pendingDown >= threshold) loss += pendingDown;
				pendingDown = 0;
			}
			pendingUp += diff;
		} else if (diff < 0) {
			if (pendingUp > 0) {
				if (pendingUp >= threshold) gain += pendingUp;
				pendingUp = 0;
			}
			pendingDown += Math.abs(diff);
		}
	}
	if (pendingUp >= threshold) gain += pendingUp;
	if (pendingDown >= threshold) loss += pendingDown;

	return { gain, loss };
}

// ── 전체 경로 캘리브레이션 ────────────────────────────────────────

/**
 * RideWithGPS API가 제공하는 전체 획득고도(knownGain)를 목표로,
 * Binary Search로 최적 threshold를 찾는다.
 *
 * 탐색 범위: 0.0 ~ 10.0m (0.05m 해상도)
 * 수렴 기준: 전체 gain이 knownGain ±10m 이내
 */
export function calibrateThreshold(
	trackPoints: TrackPoint[],
	knownGain: number,
): number {
	// e 와 d 가 모두 있는 포인트만 사용
	const validPts = trackPoints.filter(
		(p) => p.e != null && p.d != null,
	);
	if (validPts.length < 2 || knownGain <= 0) return 0;

	const elevations = validPts.map((p) => p.e as number);
	const smoothed = smoothElevations(elevations);

	// threshold=0 일 때의 gain이 기준값보다 작으면 캘리브레이션 불가
	const { gain: gainAt0 } = calcGainLossFromSmoothed(smoothed, 0);
	if (gainAt0 <= knownGain) return 0;

	// Binary search: threshold 높일수록 gain이 감소
	let lo = 0;
	let hi = 10;
	for (let iter = 0; iter < 60; iter++) {
		const mid = (lo + hi) / 2;
		const { gain } = calcGainLossFromSmoothed(smoothed, mid);
		if (Math.abs(gain - knownGain) < 5) {
			return mid;
		}
		if (gain > knownGain) {
			lo = mid; // threshold 더 높여야 gain이 줄어듦
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

// ── 구간별 고도 계산 (캘리브레이션 파라미터 적용) ─────────────────

/**
 * track_points 에서 startKm ~ endKm 구간의 획득/하강 고도를 계산한다.
 * calibratedThreshold: calibrateThreshold()로 구한 값 (없으면 0 → 이동평균만 적용)
 */
function computeElevation(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
	calibratedThreshold = 0,
): { gain: number; loss: number } {
	const startM = startKm * 1000;
	const endM = endKm * 1000;

	// 구간 필터링
	const segPts = trackPoints.filter(
		(p) =>
			p.e != null &&
			p.d != null &&
			(p.d as number) >= startM &&
			(p.d as number) <= endM,
	);
	if (segPts.length < 2) return { gain: 0, loss: 0 };

	const elevations = segPts.map((p) => p.e as number);
	const smoothed = smoothElevations(elevations);
	const { gain, loss } = calcGainLossFromSmoothed(
		smoothed,
		calibratedThreshold,
	);
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

	// Sync API Data
	useEffect(() => {
		setStages(initialStages);
	}, [initialStages]);

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
				const elev = computeElevation(
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
			const elev = computeElevation(trackPoints, startKm, endKm, calibratedThreshold);

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
		const elev = computeElevation(trackPoints, startKm, endKm, calibratedThreshold);

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
	const updateStageDistance = useCallback(
		(stageId: string, newDistanceKm: number) => {
			if (newDistanceKm <= 0) return;

			const idx = stages.findIndex((s) => s.id === stageId);
			if (idx === -1) return;

			const oldStage = stages[idx];
			const diff = newDistanceKm - oldStage.distanceKm;

			// 마지막 Stage인 경우: 미계획 구간에서 가감
			if (idx === stages.length - 1) {
				const newUnplanned = unplannedDistanceKm - diff;
				if (newUnplanned < -0.01) return; // 전체 거리 초과
				
				const updated = [...stages];
				updated[idx] = { ...oldStage, distanceKm: newDistanceKm };
				const newStages = rebuildStages(updated);
				setStages(newStages);

				if (planId && !oldStage.id.startsWith("temp-")) {
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

			if (planId) {
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
