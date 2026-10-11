import { markerOnTrack, type PlanClimbMarkerRow } from "@/lib/plan-climb-marker";
import { NextResponse } from "next/server";
import { parseNumber, SUMMIT_SELECT_COLS } from "@/app/api/summits/shared";
import type { PlanPoiRow } from "@/app/types/planPoi";
import { normalizeScheduleMarkerMemos } from "@/app/types/scheduleMarkerMemos";
import type { SummitCatalogRow } from "@/app/types/summitCatalog";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import {
	computeCPsOnRoute,
	computeSummitsOnRoute,
	type RwgpsTrackPoint,
	summitQueryStringForTrackPoints,
} from "@/lib/rwgps-plan-markers";
import {
	fetchRideWithGpsJson,
	parseRwgpsRouteId,
	unwrapRideWithGpsRoute,
} from "@/lib/rwgps-route-json";
import { supabaseAdmin } from "@/lib/supabase";

const UUID_V4_LIKE_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
	review_note: string | null;
	public_share_token: string;
	shared_at: string | null;
	schedule_marker_memos?: unknown;
	route: PublicPlanRouteRow;
	stages: PublicPlanStage[];
};

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
	const limit = limitRaw == null ? 1200 : Math.min(Math.max(Math.round(limitRaw), 1), 2000);

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

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
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
			review_note,
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
			"id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, assignment_mode, stage_id, intent, phone, address_name, place_url, naver_place_url, booking_method, booking_url, booking_checked_at, candidate_sort_order, is_candidate_excluded, created_at, updated_at",
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
	const officialSummits = fullTrack.length > 0 ? await fetchOfficialSummitsForTrack(fullTrack) : [];

	const cpMarkers =
		rwgpsRoute && fullTrack.length > 0
			? computeCPsOnRoute(rwgpsRoute.points_of_interest, fullTrack)
			: [];

	const summitMarkers =
		rwgpsRoute && fullTrack.length > 0 ? computeSummitsOnRoute(officialSummits, fullTrack) : [];

	const { data: localClimbs, error: climbError } = await supabaseAdmin
		.from("plan_climb_marker")
		.select("id,name,distance_m,summit_id")
		.eq("plan_id", row.id);
	if (climbError && !["42P01", "PGRST205"].includes(climbError.code))
		return NextResponse.json({ error: "플랜 고개 정보를 불러오지 못했습니다." }, { status: 500 });
	for (const climb of (localClimbs ?? []) as PlanClimbMarkerRow[]) {
		const marker = markerOnTrack(climb, fullTrack);
		if (marker) summitMarkers.push(marker);
	}
	summitMarkers.sort((a, b) => a.distanceKm - b.distanceKm);

	const knownRouteElevationGainM = rwgpsRoute
		? Number(rwgpsRoute.elevation_gain) || Number(routeRow.elevation_gain) || 0
		: Number(routeRow.elevation_gain) || 0;

	// Terrain analysis and marker indices require the original distance/elevation samples.
	const trackPointsForClient = fullTrack;

	return NextResponse.json({
		plan: {
			id: row.id,
			name: row.name,
			start_date: row.start_date,
			review_note: row.review_note,
			public_share_token: row.public_share_token,
			shared_at: row.shared_at,
			...(scheduleMarkerMemos != null ? { schedule_marker_memos: scheduleMarkerMemos } : {}),
		},
		route: routeForClient,
		stages: sortedStages,
		planPois,
		trackPoints: trackPointsForClient,
		officialSummits,
		cpMarkers,
		summitMarkers,
		knownRouteElevationGainM,
	});
}
