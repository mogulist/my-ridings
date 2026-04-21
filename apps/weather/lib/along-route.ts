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
