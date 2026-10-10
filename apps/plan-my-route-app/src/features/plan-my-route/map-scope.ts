import type { MobilePlanStageRow, PlanDetail, TrackPoint } from "@/features/api/plan-my-route";

export function clipMapTrack(track: TrackPoint[], startM: number, endM: number): TrackPoint[] {
	if (!Number.isFinite(startM) || !Number.isFinite(endM) || endM <= startM) return [];
	const at = (d: number): TrackPoint | null => {
		for (let i = 0; i < track.length; i++) {
			const b = track[i];
			if (b.d === d) return b;
			const a = track[i - 1];
			if (a?.d != null && b.d != null && a.d < d && b.d > d) {
				const t = (d - a.d) / (b.d - a.d);
				return { d, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
			}
		}
		return null;
	};
	const points = track.filter((p) => p.d != null && p.d > startM && p.d < endM);
	const first = at(startM),
		last = at(endM);
	return [...(first ? [first] : []), ...points, ...(last ? [last] : [])];
}
export function getMapScope(detail: PlanDetail, stageId?: string | null) {
	const stage = detail.stages.find((s) => s.id === stageId) ?? null;
	if (!stage)
		return {
			stage: null,
			track: detail.trackPoints,
			pois: detail.planPois,
			cps: detail.cpMarkers,
			summits: detail.summitMarkers,
		};
	const start = stage.start_distance,
		end = stage.end_distance;
	const inRange = (km: number) =>
		start != null && end != null && km * 1000 >= start && km * 1000 <= end;
	return {
		stage,
		track: start != null && end != null ? clipMapTrack(detail.trackPoints, start, end) : [],
		cps: detail.cpMarkers.filter((p) => inRange(p.distanceKm)),
		summits: detail.summitMarkers.filter((p) => inRange(p.distanceKm)),
		pois: detail.planPois.filter((p) => {
			if (p.assignment_mode === "stage" && p.stage_id) return p.stage_id === stage.id;
			if (p.assignment_mode === "plan") return false;
			const nearest = detail.trackPoints.reduce<TrackPoint | null>(
				(a, b) =>
					!a || (b.x - p.lng) ** 2 + (b.y - p.lat) ** 2 < (a.x - p.lng) ** 2 + (a.y - p.lat) ** 2
						? b
						: a,
				null,
			);
			return nearest?.d != null && inRange(nearest.d / 1000);
		}),
	};
}
