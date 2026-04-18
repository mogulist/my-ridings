import type { TrackPoint } from "./track-point";

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

function calcGainAtEachIndex(smoothed: number[], threshold: number): number[] {
	const gainAt: number[] = [0];
	let gain = 0;
	let pendingUp = 0;
	let pendingDown = 0;

	for (let i = 1; i < smoothed.length; i++) {
		const diff = smoothed[i] - smoothed[i - 1];
		if (diff > 0) {
			if (pendingDown > 0) {
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
		gainAt.push(gain);
	}
	if (pendingUp >= threshold) gain += pendingUp;
	gainAt[gainAt.length - 1] = gain;

	return gainAt;
}

/**
 * 구간 [startKm, endKm] 내 각 포인트까지의 누적 상승고도 곡선.
 * 스테이지 상승고도와 동일한 smoothing + threshold 적용.
 */
export function computeElevationGainCurve(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
	calibratedThreshold: number,
): { distanceM: number; gain: number }[] {
	const startM = startKm * 1000;
	const endM = endKm * 1000;

	const segPts = trackPoints.filter(
		(p) =>
			p.e != null &&
			p.d != null &&
			(p.d as number) >= startM &&
			(p.d as number) <= endM,
	);
	if (segPts.length < 2) return [];

	const elevations = segPts.map((p) => p.e as number);
	const smoothed = smoothElevations(elevations);
	const gainAt = calcGainAtEachIndex(smoothed, calibratedThreshold);

	return segPts.map((p, i) => ({
		distanceM: p.d as number,
		gain: Math.round(gainAt[i]),
	}));
}

/**
 * RideWithGPS API가 제공하는 전체 획득고도(knownGain)를 목표로,
 * Binary Search로 최적 threshold를 찾는다.
 *
 * 탐색 범위: 0.0 ~ 10.0m (0.05m 해상도)
 * 수렴 기준: 전체 gain이 knownGain ±10m 이내
 */
export function calibrateThreshold(trackPoints: TrackPoint[], knownGain: number): number {
	const validPts = trackPoints.filter((p) => p.e != null && p.d != null);
	if (validPts.length < 2 || knownGain <= 0) return 0;

	const elevations = validPts.map((p) => p.e as number);
	const smoothed = smoothElevations(elevations);

	const { gain: gainAt0 } = calcGainLossFromSmoothed(smoothed, 0);
	if (gainAt0 <= knownGain) return 0;

	let lo = 0;
	let hi = 10;
	for (let iter = 0; iter < 60; iter++) {
		const mid = (lo + hi) / 2;
		const { gain } = calcGainLossFromSmoothed(smoothed, mid);
		if (Math.abs(gain - knownGain) < 5) {
			return mid;
		}
		if (gain > knownGain) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

/**
 * track_points 에서 startKm ~ endKm 구간의 획득/하강 고도를 계산한다.
 * calibratedThreshold: calibrateThreshold()로 구한 값 (없으면 0 → 이동평균만 적용)
 */
export function computeTrackElevationGainLoss(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
	calibratedThreshold = 0,
): { gain: number; loss: number } {
	const startM = startKm * 1000;
	const endM = endKm * 1000;

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
	const { gain, loss } = calcGainLossFromSmoothed(smoothed, calibratedThreshold);
	return { gain: Math.round(gain), loss: Math.round(loss) };
}
