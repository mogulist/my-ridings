import { latLngToGrid } from "@my-ridings/weather-grid";

const EARTH_R_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineKm = (a: [number, number], b: [number, number]): number => {
	const [lat1, lng1] = a;
	const [lat2, lng2] = b;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};

export const polylineLengthKm = (poly: [number, number][]): number => {
	let sum = 0;
	for (let i = 1; i < poly.length; i += 1) {
		sum += haversineKm(poly[i - 1], poly[i]);
	}
	return sum;
};

/** 누적 거리 `targetKm` 지점의 좌표(선형 보간). */
export const pointAlongPolylineKm = (
	poly: [number, number][],
	targetKm: number,
): [number, number] => {
	if (poly.length === 0) return [0, 0];
	if (poly.length === 1) return poly[0];
	let acc = 0;
	for (let i = 1; i < poly.length; i += 1) {
		const segKm = haversineKm(poly[i - 1], poly[i]);
		if (acc + segKm >= targetKm) {
			const t = segKm <= 0 ? 0 : (targetKm - acc) / segKm;
			return [
				poly[i - 1][0] + t * (poly[i][0] - poly[i - 1][0]),
				poly[i - 1][1] + t * (poly[i][1] - poly[i - 1][1]),
			];
		}
		acc += segKm;
	}
	return poly[poly.length - 1];
};

export const etaAtIso = (departIso: string, offsetHours: number): string => {
	const ms = Date.parse(departIso) + offsetHours * 3600000;
	return new Date(ms).toISOString();
};

/** polyline을 따라 sampleStepKm마다 격자를 읽고, 연속 동일 (nx,ny)는 구간으로 병합한다. */
export type GridSegmentAlongRoute = {
	nx: number;
	ny: number;
	kmFrom: number;
	kmTo: number;
	/** 구간 대표 (중간 누적 km) */
	mid: [number, number];
};

const DEFAULT_SAMPLE_KM = 0.12;

/**
 * @param totalKm `polylineLengthKm(poly)`와 같아야 함
 */
export const gridsAlongPolyline = (
	poly: [number, number][],
	totalKm: number,
	sampleStepKm: number = DEFAULT_SAMPLE_KM,
): GridSegmentAlongRoute[] => {
	if (poly.length < 2 || totalKm <= 0) return [];

	const samples: { km: number; nx: number; ny: number }[] = [];
	for (let km = 0; km < totalKm; km += sampleStepKm) {
		const mid = pointAlongPolylineKm(poly, km);
		const g = latLngToGrid(mid[0], mid[1]);
		samples.push({ km, nx: g.nx, ny: g.ny });
	}
	{
		const mid = pointAlongPolylineKm(poly, totalKm);
		const g = latLngToGrid(mid[0], mid[1]);
		const last = samples.at(-1);
		if (!last || last.km < totalKm - 1e-9 || last.nx !== g.nx || last.ny !== g.ny) {
			samples.push({ km: totalKm, nx: g.nx, ny: g.ny });
		}
	}

	const runs: GridSegmentAlongRoute[] = [];
	let i = 0;
	while (i < samples.length) {
		const cur = samples[i];
		if (!cur) break;
		const { nx, ny, km: kmFrom } = cur;
		let j = i;
		while (j + 1 < samples.length) {
			const next = samples[j + 1];
			if (!next || next.nx !== nx || next.ny !== ny) break;
			j += 1;
		}
		const end = samples[j];
		if (!end) break;
		const kmTo = end.km;
		const midKm = (kmFrom + kmTo) * 0.5;
		const mid = pointAlongPolylineKm(poly, midKm);
		runs.push({ nx, ny, kmFrom, kmTo, mid });
		i = j + 1;
	}
	return runs;
};
