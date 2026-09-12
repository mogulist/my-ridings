import type { TrackPoint } from "@my-ridings/plan-geometry";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { fetchNearbyAlongRoute } from "@/lib/nearby-cache";
import { findNearbyCategorySearch } from "@/lib/nearby-categories";
import {
	fetchRideWithGpsJson,
	parseRwgpsRouteId,
	unwrapRideWithGpsRoute,
} from "@/lib/rwgps-route-json";
import { supabaseAdmin } from "@/lib/supabase";

function parseBounds(searchParams: URLSearchParams) {
	const values = ["swLng", "swLat", "neLng", "neLat"].map((key) => Number(searchParams.get(key)));
	if (values.some((value) => !Number.isFinite(value))) return null;
	const [swLng, swLat, neLng, neLat] = values;
	if (swLng >= neLng || swLat >= neLat) return null;
	return { swLng, swLat, neLng, neLat };
}

async function loadTrackPoints(rwgpsUrl: string): Promise<TrackPoint[] | null> {
	const rwgpsId = parseRwgpsRouteId(rwgpsUrl);
	if (!rwgpsId) return null;
	const json = await fetchRideWithGpsJson(rwgpsId);
	const unwrapped = json ? unwrapRideWithGpsRoute(json) : null;
	return unwrapped ? (unwrapped.track_points as TrackPoint[]) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: routeId } = await params;
	const { searchParams } = new URL(request.url);

	const categoryId = searchParams.get("category") ?? "";
	if (!findNearbyCategorySearch(categoryId)) {
		return NextResponse.json({ error: "unknown category" }, { status: 400 });
	}
	const bounds = parseBounds(searchParams);
	if (!bounds) {
		return NextResponse.json({ error: "swLng/swLat/neLng/neLat is required" }, { status: 400 });
	}
	const maxDetourParam = Number(searchParams.get("maxDetourM"));

	const apiKey = process.env.KAKAO_REST_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 });
	}

	const { data: route, error: routeError } = await supabaseAdmin
		.from("route")
		.select("id, rwgps_url")
		.eq("id", routeId)
		.single();
	if (routeError || !route) {
		return NextResponse.json({ error: "route not found" }, { status: 404 });
	}

	const trackPoints = await loadTrackPoints(route.rwgps_url);
	if (!trackPoints?.length) {
		return NextResponse.json({ error: "route track points unavailable" }, { status: 502 });
	}

	try {
		const result = await fetchNearbyAlongRoute({
			trackPoints,
			categoryId,
			bounds,
			maxDetourM:
				Number.isFinite(maxDetourParam) && maxDetourParam > 0 ? maxDetourParam : undefined,
			kakaoApiKey: apiKey,
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("nearby cache error:", error);
		return NextResponse.json({ error: "Failed to load nearby places" }, { status: 502 });
	}
}
