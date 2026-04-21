import { alongForecastResponseSchema } from "@my-ridings/weather-types";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import {
	fetchRideWithGpsJson,
	parseRwgpsRouteId,
	unwrapRideWithGpsRoute,
} from "@/lib/rwgps-route-json";
import { supabaseAdmin } from "@/lib/supabase";
import { sliceStagePolylineLatLng } from "@/lib/track-stage-polyline";

const UUID_V4_LIKE_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PlanStageRow = {
	start_distance: number | null;
	end_distance: number | null;
};

type PlanRowWithRoute = {
	id: string;
	start_date: string | null;
	route: {
		rwgps_url: string;
		total_distance: number | null;
		user_id: string;
	} | null;
	stages: PlanStageRow[];
};

function resolveDepartAtIso(
	planStartDate: string | null,
	dayNumber: number,
	departAtRaw: unknown,
): string {
	if (typeof departAtRaw === "string" && departAtRaw.trim()) {
		const t = Date.parse(departAtRaw.trim());
		if (!Number.isNaN(t)) return new Date(t).toISOString();
	}
	if (!planStartDate) return new Date().toISOString();
	const dt = new Date(`${planStartDate}T07:00:00+09:00`);
	if (Number.isNaN(dt.getTime())) return new Date().toISOString();
	dt.setDate(dt.getDate() + (dayNumber - 1));
	return dt.toISOString();
}

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { planId } = await params;
	if (!planId || !UUID_V4_LIKE_REGEX.test(planId)) {
		return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
	const dayNumber = Number(b.dayNumber);
	const segments = b.segments === undefined ? 4 : Number(b.segments);
	const paceKmh = b.paceKmh === undefined ? 22 : Number(b.paceKmh);

	if (!Number.isInteger(dayNumber) || dayNumber < 1) {
		return NextResponse.json({ error: "Invalid dayNumber" }, { status: 400 });
	}
	if (!Number.isFinite(segments) || segments < 1 || segments > 24 || !Number.isInteger(segments)) {
		return NextResponse.json({ error: "Invalid segments" }, { status: 400 });
	}
	if (!Number.isFinite(paceKmh) || paceKmh <= 0 || paceKmh > 80) {
		return NextResponse.json({ error: "Invalid paceKmh" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("plan")
		.select(
			`
			id,
			start_date,
			route:route (
				rwgps_url,
				total_distance,
				user_id
			),
			stages:stage (
				start_distance,
				end_distance
			)
		`,
		)
		.eq("id", planId)
		.single();

	if (error || !data) {
		return NextResponse.json({ error: "Plan not found" }, { status: 404 });
	}

	const row = data as unknown as PlanRowWithRoute;
	const routeRow = row.route;
	if (!routeRow || routeRow.user_id !== user.id) {
		return NextResponse.json({ error: "Plan not found" }, { status: 404 });
	}

	const sortedStages = [...(row.stages ?? [])].sort(
		(a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0),
	);

	if (dayNumber > sortedStages.length) {
		return NextResponse.json({ error: "Invalid dayNumber" }, { status: 400 });
	}

	const stage = sortedStages[dayNumber - 1];
	if (!stage) {
		return NextResponse.json({ error: "Invalid dayNumber" }, { status: 400 });
	}
	const startM = Number(stage.start_distance) || 0;
	const endRaw = stage.end_distance;
	const endM = endRaw != null && Number.isFinite(Number(endRaw)) ? Number(endRaw) : startM + 100;

	const rwgpsId = parseRwgpsRouteId(routeRow.rwgps_url);
	const rwgpsRaw = rwgpsId ? await fetchRideWithGpsJson(rwgpsId) : null;
	const rwgpsRoute = unwrapRideWithGpsRoute(rwgpsRaw);
	const fullTrack = rwgpsRoute?.track_points ?? [];
	if (fullTrack.length < 2) {
		return NextResponse.json({ error: "Route track unavailable" }, { status: 422 });
	}

	const routeTotalM =
		rwgpsRoute && rwgpsRoute.distance > 0
			? rwgpsRoute.distance * 1000
			: routeRow.total_distance != null && Number(routeRow.total_distance) > 0
				? Number(routeRow.total_distance) * 1000
				: null;

	const polyline = sliceStagePolylineLatLng(fullTrack, startM, endM, routeTotalM);
	if (polyline.length < 2) {
		return NextResponse.json({ error: "Stage polyline too short" }, { status: 422 });
	}

	const departAt = resolveDepartAtIso(row.start_date, dayNumber, b.departAt);

	const weatherOrigin = process.env.WEATHER_SERVICE_ORIGIN?.trim().replace(/\/+$/, "");
	const weatherKey = process.env.WEATHER_INTERNAL_API_KEY?.trim();
	if (!weatherOrigin || !weatherKey) {
		return NextResponse.json({ error: "Weather service not configured" }, { status: 503 });
	}

	const wRes = await fetch(`${weatherOrigin}/api/v1/forecast/along`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${weatherKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			polyline,
			segments,
			departAt,
			paceKmh,
		}),
	});

	if (!wRes.ok) {
		const text = await wRes.text();
		return NextResponse.json(
			{
				error: `Weather request failed (${wRes.status})`,
				detail: text.slice(0, 500),
			},
			{ status: 502 },
		);
	}

	const wJson: unknown = await wRes.json();
	const parsed = alongForecastResponseSchema.safeParse(wJson);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid weather response" }, { status: 502 });
	}

	return NextResponse.json(parsed.data);
}
