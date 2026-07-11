import { computeTrackElevationGainLoss } from "@my-ridings/plan-geometry";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { CPOnRoute } from "./types";

type TrackPointWithElevation = TrackPoint & { e: number; d: number };

/** 스테이지(또는 전체) 기준: minDistanceKm 이전에 있는 CP는 직전 CP 후보에서 제외 */
export function findPrevCPInContext(
	cpMarkers: CPOnRoute[],
	distanceKm: number,
	minDistanceKm: number,
): CPOnRoute | null {
	let prev: CPOnRoute | null = null;
	for (const cp of cpMarkers) {
		if (cp.distanceKm < minDistanceKm) continue;
		if (cp.distanceKm <= distanceKm) prev = cp;
		else break;
	}
	return prev;
}

export function findNextCPInContext(
	cpMarkers: CPOnRoute[],
	distanceKm: number,
	maxDistanceKm: number,
): CPOnRoute | null {
	for (const cp of cpMarkers) {
		if (cp.distanceKm > distanceKm && cp.distanceKm <= maxDistanceKm) return cp;
	}
	return null;
}

/** 트랙 상에서 fromKm~toKm 구간의 단순 누적 상승고도(m). 고도 프로필 비스무딩 경로와 동일한 원시 합산. */
export function computeRawGainBetweenKm(
	points: TrackPoint[],
	fromKm: number,
	toKm: number,
): number {
	const withEle = points.filter(
		(p): p is TrackPointWithElevation => p.e != null && p.d != null,
	);
	if (withEle.length < 2 || toKm <= fromKm) return 0;
	const findIdx = (km: number) => {
		const idx = withEle.findIndex((p) => p.d / 1000 >= km);
		return idx === -1 ? withEle.length - 1 : idx;
	};
	const i0 = findIdx(fromKm);
	const i1 = findIdx(toKm);
	if (i1 <= i0) return 0;
	let gain = 0;
	for (let i = i0 + 1; i <= i1; i++) {
		const prevE = withEle[i - 1].e;
		const currE = withEle[i].e;
		gain += Math.max(0, currE - prevE);
	}
	return Math.round(gain);
}

export function computeSegmentGainBetweenKm(
	points: TrackPoint[],
	fromKm: number,
	toKm: number,
	elevationCalibratedThreshold?: number,
): number {
	if (toKm <= fromKm) return 0;
	const useSmooth =
		typeof elevationCalibratedThreshold === "number" && elevationCalibratedThreshold >= 0;
	if (useSmooth) {
		return computeTrackElevationGainLoss(points, fromKm, toKm, elevationCalibratedThreshold).gain;
	}
	return computeRawGainBetweenKm(points, fromKm, toKm);
}

