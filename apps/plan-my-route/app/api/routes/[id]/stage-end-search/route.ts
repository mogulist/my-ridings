import type { TrackPoint } from "@my-ridings/plan-geometry";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { fetchNearbyAlongRoute } from "@/lib/nearby-cache";
import {
	fetchRideWithGpsJson,
	parseRwgpsRouteId,
	unwrapRideWithGpsRoute,
} from "@/lib/rwgps-route-json";
import { analyzeStageEndPlaces } from "@/lib/stage-end-search";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SEARCH_SPAN_KM = 200;
const MAX_SEGMENT_CELLS = 60;

function sliceTrackPoints(trackPoints: TrackPoint[], startKm: number, endKm: number): TrackPoint[] {
	const firstInside = trackPoints.findIndex((point) => (point.d ?? 0) / 1000 >= startKm);
	if (firstInside < 0) return [];
	let lastInside = firstInside;
	while (lastInside < trackPoints.length && (trackPoints[lastInside]?.d ?? 0) / 1000 <= endKm) {
		lastInside += 1;
	}
	return trackPoints.slice(
		Math.max(0, firstInside - 1),
		Math.min(trackPoints.length, lastInside + 1),
	);
}

function segmentBounds(trackPoints: TrackPoint[]) {
	const lngs = trackPoints.map((point) => point.x);
	const lats = trackPoints.map((point) => point.y);
	const padding = 0.0001;
	return {
		swLng: Math.min(...lngs) - padding,
		swLat: Math.min(...lats) - padding,
		neLng: Math.max(...lngs) + padding,
		neLat: Math.max(...lats) + padding,
	};
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const url = new URL(request.url);
	const startKm = Number(url.searchParams.get("startKm"));
	const endKm = Number(url.searchParams.get("endKm"));
	if (
		!Number.isFinite(startKm) ||
		!Number.isFinite(endKm) ||
		startKm < 0 ||
		endKm <= startKm ||
		endKm - startKm > MAX_SEARCH_SPAN_KM
	) {
		return NextResponse.json(
			{ error: `0km보다 크고 ${MAX_SEARCH_SPAN_KM}km 이하인 구간을 선택하세요.` },
			{ status: 400 },
		);
	}

	const apiKey = process.env.KAKAO_REST_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 });
	}

	const { id: routeId } = await params;
	const { data: route, error: routeError } = await supabaseAdmin
		.from("route")
		.select("id, rwgps_url")
		.eq("id", routeId)
		.single();
	if (routeError || !route) {
		return NextResponse.json({ error: "route not found" }, { status: 404 });
	}

	const rwgpsId = parseRwgpsRouteId(route.rwgps_url);
	const json = rwgpsId ? await fetchRideWithGpsJson(rwgpsId) : null;
	const rwgpsRoute = json ? unwrapRideWithGpsRoute(json) : null;
	if (!rwgpsRoute?.track_points.length) {
		return NextResponse.json({ error: "route track points unavailable" }, { status: 502 });
	}

	const segment = sliceTrackPoints(rwgpsRoute.track_points, startKm, endKm);
	if (segment.length < 2) {
		return NextResponse.json({ error: "선택한 구간에 경로가 없습니다." }, { status: 400 });
	}

	const startedAt = performance.now();
	const bounds = segmentBounds(segment);
	try {
		const [accommodationResult, convenienceResult] = await Promise.all([
			fetchNearbyAlongRoute({
				trackPoints: segment,
				categoryId: "accommodation",
				bounds,
				maxCells: MAX_SEGMENT_CELLS,
				kakaoApiKey: apiKey,
			}),
			fetchNearbyAlongRoute({
				trackPoints: segment,
				categoryId: "convenience",
				bounds,
				maxCells: MAX_SEGMENT_CELLS,
				kakaoApiKey: apiKey,
			}),
		]);
		const analysis = analyzeStageEndPlaces({
			startKm,
			endKm,
			accommodations: accommodationResult.documents,
			conveniences: convenienceResult.documents,
		});
		return NextResponse.json({
			...analysis,
			meta: {
				durationMs: Math.round(performance.now() - startedAt),
				scannedCells: accommodationResult.meta.scanned_cells + convenienceResult.meta.scanned_cells,
				servedCells: accommodationResult.meta.served_cells + convenienceResult.meta.served_cells,
				kakaoRequests:
					accommodationResult.meta.kakao_requests + convenienceResult.meta.kakao_requests,
				isTruncated: accommodationResult.meta.is_truncated || convenienceResult.meta.is_truncated,
			},
		});
	} catch (error) {
		console.error("stage end search error:", error);
		return NextResponse.json({ error: "선택 구간의 장소를 검색하지 못했습니다." }, { status: 502 });
	}
}
