import type { RwgpsPointOfInterest, RwgpsTrackPoint } from "@/lib/rwgps-plan-markers";

export function parseRwgpsRouteId(url: string | null | undefined): string | null {
	if (!url) return null;
	const m = url.match(/\/routes\/(\d+)/);
	return m?.[1] ?? null;
}

export async function fetchRideWithGpsJson(routeId: string): Promise<unknown | null> {
	try {
		const res = await fetch(`https://ridewithgps.com/routes/${routeId}.json`, {
			headers: {
				Accept: "application/json",
				"User-Agent": "plan-my-route/1.0",
			},
			next: { revalidate: 3600 },
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export function unwrapRideWithGpsRoute(json: unknown): {
	track_points: RwgpsTrackPoint[];
	points_of_interest: RwgpsPointOfInterest[];
	elevation_gain: number;
	elevation_loss: number;
	distance: number;
	id: number;
	name: string;
} | null {
	if (!json || typeof json !== "object") return null;
	const root = json as Record<string, unknown>;
	const base = (root.route as Record<string, unknown> | undefined) ?? root;
	const tp = base.track_points;
	const pois = base.points_of_interest;
	if (!Array.isArray(tp) || tp.length === 0) return null;
	return {
		track_points: tp as RwgpsTrackPoint[],
		points_of_interest: Array.isArray(pois) ? (pois as RwgpsPointOfInterest[]) : [],
		elevation_gain: Number(base.elevation_gain) || 0,
		elevation_loss: Number(base.elevation_loss) || 0,
		distance: Number(base.distance) || 0,
		id: Number(base.id) || 0,
		name: typeof base.name === "string" ? base.name : "",
	};
}
