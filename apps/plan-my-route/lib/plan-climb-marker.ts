export type PlanClimbMarkerRow = {
	id: string;
	name: string;
	distance_m: number;
	summit_id: string | null;
};
export function parsePlanClimbMarker(body: unknown) {
	if (!body || typeof body !== "object" || Array.isArray(body)) return null;
	const value = body as Record<string, unknown>;
	const name = typeof value.name === "string" ? value.name.trim() : "";
	const distance = value.distanceM;
	const summitId = value.summitId;
	if (
		!name ||
		name.length > 100 ||
		typeof distance !== "number" ||
		!Number.isFinite(distance) ||
		distance < 0
	)
		return null;
	if (summitId != null && (typeof summitId !== "string" || !/^[0-9a-f-]{36}$/i.test(summitId)))
		return null;
	return {
		name,
		distance_m: Math.round(distance / 10) * 10,
		summit_id: typeof summitId === "string" ? summitId : null,
	};
}
export function markerOnTrack(row: PlanClimbMarkerRow, track: { d?: number; e?: number }[]) {
	let best = -1;
	for (let i = 0; i < track.length; i++) {
		const d = track[i].d;
		if (
			d != null &&
			(best < 0 || Math.abs(d - row.distance_m) < Math.abs(track[best].d! - row.distance_m))
		)
			best = i;
	}
	if (best < 0) return null;
	return {
		id: row.id,
		passIndex: 0,
		name: row.name,
		distanceKm: row.distance_m / 1000,
		elevation: track[best].e ?? 0,
		trackPointIndex: best,
	};
}
