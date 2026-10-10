import type { TrackPoint } from "@my-ridings/plan-geometry";
export type ElevationBin = {
	startKm: number;
	endKm: number;
	minM: number | null;
	maxM: number | null;
};
/** Preserve the min/max envelope within each distance bin, including peaks between displayed points. */
export function buildElevationEnvelope(
	track: TrackPoint[],
	startKm: number,
	endKm: number,
	count = 120,
): ElevationBin[] {
	if (
		!Number.isFinite(startKm) ||
		!Number.isFinite(endKm) ||
		endKm <= startKm ||
		count < 1 ||
		!Number.isInteger(count)
	)
		return [];
	const points = track
		.filter((p) => Number.isFinite(p.d))
		.map((p) => ({ d: p.d! / 1000, e: Number.isFinite(p.e) ? p.e! : null }));
	const bins: ElevationBin[] = [];
	let cursor = 0;
	for (let i = 0; i < count; i++) {
		const start = startKm + ((endKm - startKm) * i) / count,
			end = startKm + ((endKm - startKm) * (i + 1)) / count;
		while (cursor + 1 < points.length && points[cursor + 1].d <= start) cursor++;
		let min = Infinity,
			max = -Infinity,
			unknown = false;
		const include = (e: number | null) => {
			if (e == null) unknown = true;
			else {
				min = Math.min(min, e);
				max = Math.max(max, e);
			}
		};
		let j = cursor;
		while (j + 1 < points.length && points[j].d < end) {
			const a = points[j],
				b = points[j + 1];
			const left = Math.max(start, a.d),
				right = Math.min(end, b.d);
			if (right > left) {
				if (a.e == null || b.e == null || b.d - a.d > 0.5 || b.d <= a.d) unknown = true;
				else {
					include(a.e + ((b.e - a.e) * (left - a.d)) / (b.d - a.d));
					include(a.e + ((b.e - a.e) * (right - a.d)) / (b.d - a.d));
				}
			}
			j++;
		}
		if (!points.length || start < points[0].d || end > points[points.length - 1].d) unknown = true;
		bins.push({
			startKm: start,
			endKm: end,
			minM: unknown || !Number.isFinite(min) ? null : min,
			maxM: unknown || !Number.isFinite(max) ? null : max,
		});
	}
	return bins;
}
