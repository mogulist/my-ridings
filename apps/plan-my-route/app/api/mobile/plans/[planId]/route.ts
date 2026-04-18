import { NextResponse } from "next/server";
import { parseNumber, SUMMIT_SELECT_COLS } from "@/app/api/summits/shared";
import type { PlanPoiRow } from "@/app/types/planPoi";
import type { SummitCatalogRow } from "@/app/types/summitCatalog";
import { normalizeScheduleMarkerMemos } from "@/app/types/scheduleMarkerMemos";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import {
	computeCPsOnRoute,
	computeSummitsOnRoute,
	type RwgpsPointOfInterest,
	type RwgpsTrackPoint,
	summitQueryStringForTrackPoints,
} from "@/lib/rwgps-plan-markers";
import { supabaseAdmin } from "@/lib/supabase";

const UUID_V4_LIKE_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_TRACK_POINTS_IN_RESPONSE = 2500;

type PublicPlanStage = {
	id: string;
	title: string | null;
	start_distance: number | null;
	end_distance: number | null;
	elevation_gain: number | null;
	elevation_loss: number | null;
	memo: string | null;
	start_name: string | null;
	end_name: string | null;
};

type PublicPlanRouteForClient = {
	name: string;
	rwgps_url: string;
	total_distance: number | null;
	elevation_gain: number | null;
	elevation_loss: number | null;
	cover_image_hero_url: string | null;
	cover_image_og_url: string | null;
};

type PublicPlanRouteRow = PublicPlanRouteForClient & { user_id: string };

type PlanRowWithNested = {
	id: string;
	name: string;
	start_date: string | null;
	public_share_token: string;
	shared_at: string | null;
	schedule_marker_memos?: unknown;
	route: PublicPlanRouteRow;
	stages: PublicPlanStage[];
};

function sampleTrackPoints<T>(points: T[], maxPoints: number): T[] {
	if (points.length <= maxPoints) return points;
	const step = Math.ceil(points.length / maxPoints);
	const out: T[] = [];
	for (let i = 0; i < points.length; i += step) {
		out.push(points[i]!);
	}
	const last = points[points.length - 1]!;
	if (out[out.length - 1] !== last) out.push(last);
	return out;
}

function parseRwgpsRouteId(url: string | null | undefined): string | null {
	if (!url) return null;
	const m = url.match(/\/routes\/(\d+)/);
	return m?.[1] ?? null;
}

async function fetchRideWithGpsJson(routeId: string): Promise<unknown | null> {
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

function unwrapRideWithGpsRoute(json: unknown): {
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

async function fetchOfficialSummitsForTrack(
	trackPoints: RwgpsTrackPoint[],
): Promise<SummitCatalogRow[]> {
	const qs = summitQueryStringForTrackPoints(trackPoints);
	if (!qs) return [];
	const sp = new URLSearchParams(qs);
	const minLat = parseNumber(sp.get("minLat"));
	const maxLat = parseNumber(sp.get("maxLat"));
	const minLng = parseNumber(sp.get("minLng"));
	const maxLng = parseNumber(sp.get("maxLng"));
	const limitRaw = parseNumber(sp.get("limit"));
	const limit =
		limitRaw == null ? 1200 : Math.min(Math.max(Math.round(limitRaw), 1), 2000);

	let query = supabaseAdmin
		.from("summit_catalog")
		.select(SUMMIT_SELECT_COLS)
		.eq("is_official", true)
		.eq("status", "approved")
		.order("updated_at", { ascending: false })
		.limit(limit);

	if (minLat != null) query = query.gte("lat", minLat);
	if (maxLat != null) query = query.lte("lat", maxLat);
	if (minLng != null) query = query.gte("lng", minLng);
	if (maxLng != null) query = query.lte("lng", maxLng);

	const { data, error } = await query;
	if (error) return [];
	return (data ?? []) as SummitCatalogRow[];
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ planId: string }> },
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { planId } = await params;
	if (!planId || !UUID_V4_LIKE_REGEX.test(planId)) {
		return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("plan")
		.select(
			`
			id,
			name,
			start_date,
			public_share_token,
			shared_at,
			schedule_marker_memos,
			route:route (
				name,
				rwgps_url,
				total_distance,
				elevation_gain,
				elevation_loss,
				cover_image_hero_url,
				cover_image_og_url,
				user_id
			),
			stages:stage (
				id,
				title,
				start_distance,
				end_distance,
				elevation_gain,
				elevation_loss,
				memo,
				start_name,
				end_name
			)
		`,
		)
		.eq("id", planId)
		.single();

	if (error || !data) {
		return NextResponse.json({ error: "Plan not found" }, { status: 404 });
	}

	const row = data as unknown as PlanRowWithNested;
	const routeRow = row.route;
	if (!routeRow || routeRow.user_id !== user.id) {
		return NextResponse.json({ error: "Plan not found" }, { status: 404 });
	}

	const sortedStages = [...(row.stages ?? [])].sort(
		(a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0),
	);

	let planPois: PlanPoiRow[] = [];
	const { data: poiRows, error: poiError } = await supabaseAdmin
		.from("plan_poi")
		.select(
			"id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, created_at, updated_at",
		)
		.eq("plan_id", row.id)
		.order("created_at", { ascending: true });

	if (!poiError && poiRows) {
		planPois = poiRows as PlanPoiRow[];
	}

	const routeForClient: PublicPlanRouteForClient = {
		name: routeRow.name,
		rwgps_url: routeRow.rwgps_url,
		total_distance: routeRow.total_distance,
		elevation_gain: routeRow.elevation_gain,
		elevation_loss: routeRow.elevation_loss,
		cover_image_hero_url: routeRow.cover_image_hero_url,
		cover_image_og_url: routeRow.cover_image_og_url,
	};

	const scheduleMarkerMemos = normalizeScheduleMarkerMemos(row.schedule_marker_memos);

	const rwgpsId = parseRwgpsRouteId(routeRow.rwgps_url);
	const rwgpsRaw = rwgpsId ? await fetchRideWithGpsJson(rwgpsId) : null;
	const rwgpsRoute = unwrapRideWithGpsRoute(rwgpsRaw);

	const fullTrack = rwgpsRoute?.track_points ?? [];
	const officialSummits =
		fullTrack.length > 0 ? await fetchOfficialSummitsForTrack(fullTrack) : [];

	const cpMarkers =
		rwgpsRoute && fullTrack.length > 0
			? computeCPsOnRoute(rwgpsRoute.points_of_interest, fullTrack)
			: [];

	const summitMarkers =
		rwgpsRoute && fullTrack.length > 0
			? computeSummitsOnRoute(officialSummits, fullTrack)
			: [];

	const knownRouteElevationGainM = rwgpsRoute
		? Number(rwgpsRoute.elevation_gain) || Number(routeRow.elevation_gain) || 0
		: Number(routeRow.elevation_gain) || 0;

	const trackPointsSampled =
		fullTrack.length > 0 ? sampleTrackPoints(fullTrack, MAX_TRACK_POINTS_IN_RESPONSE) : [];

	return NextResponse.json({
		plan: {
			id: row.id,
			name: row.name,
			start_date: row.start_date,
			public_share_token: row.public_share_token,
			shared_at: row.shared_at,
			...(scheduleMarkerMemos != null ? { schedule_marker_memos: scheduleMarkerMemos } : {}),
		},
		route: routeForClient,
		stages: sortedStages,
		planPois,
		trackPoints: trackPointsSampled,
		officialSummits,
		cpMarkers,
		summitMarkers,
		knownRouteElevationGainM,
	});
}
