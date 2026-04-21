import type { RwgpsTrackPoint } from "@/lib/rwgps-plan-markers";

const EARTH_R_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

const segmentKm = (a: RwgpsTrackPoint, b: RwgpsTrackPoint): number => {
	const dLat = toRad(b.y - a.y);
	const dLng = toRad(b.x - a.x);
	const s =
		Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.y)) * Math.cos(toRad(b.y)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};

/** RWGPS 트랙에서 스테이지 구간 [startM, endM] (미터)에 해당하는 [lat, lng][] (최소 2점). */
export function sliceStagePolylineLatLng(
	points: RwgpsTrackPoint[],
	startM: number,
	endM: number,
	routeTotalM: number | null,
): [number, number][] {
	if (points.length < 2) return [];

	const lo = Math.min(startM, endM);
	let hi = Math.max(startM, endM);
	if (hi <= lo) hi = lo + 1;

	const lastD = points[points.length - 1]?.d;
	const totalM =
		typeof lastD === "number" && lastD > 0
			? lastD
			: routeTotalM && routeTotalM > 0
				? routeTotalM
				: null;

	const hasProgressiveD = points.some((p) => typeof p.d === "number");

	if (hasProgressiveD && totalM != null) {
		let i0 = 0;
		while (i0 < points.length && (points[i0].d ?? 0) < lo) i0 += 1;
		let i1 = points.length - 1;
		while (i1 > 0 && (points[i1].d ?? 0) > hi) i1 -= 1;
		if (i0 > i1) {
			const mid = Math.max(0, Math.min(points.length - 1, Math.floor((i0 + i1) / 2)));
			i0 = Math.max(0, mid - 1);
			i1 = Math.min(points.length - 1, mid + 1);
		}
		const slice = points.slice(i0, i1 + 1).map((p) => [p.y, p.x] as [number, number]);
		return ensureMinTwoPoints(slice);
	}

	const estTotalM =
		totalM ??
		(() => {
			let acc = 0;
			for (let i = 1; i < points.length; i += 1) acc += segmentKm(points[i - 1], points[i]) * 1000;
			return acc > 0 ? acc : 1;
		})();

	const n = points.length;
	const f0 = Math.max(0, Math.min(1, lo / estTotalM));
	const f1 = Math.max(f0 + 1e-6, Math.min(1, hi / estTotalM));
	const i0 = Math.max(0, Math.floor(f0 * (n - 1)));
	const i1 = Math.min(n - 1, Math.ceil(f1 * (n - 1)));
	const slice = points.slice(i0, i1 + 1).map((p) => [p.y, p.x] as [number, number]);
	return ensureMinTwoPoints(slice);
}

function ensureMinTwoPoints(slice: [number, number][]): [number, number][] {
	if (slice.length >= 2) return slice;
	if (slice.length === 1) {
		const [lat, lng] = slice[0];
		return [
			[lat, lng],
			[lat + 1e-5, lng + 1e-5],
		];
	}
	return [];
}
