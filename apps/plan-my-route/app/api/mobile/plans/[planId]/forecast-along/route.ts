import { appendFileSync } from "node:fs";
import { stageBriefingResponseSchema } from "@my-ridings/weather-types";
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

const kstTodayYmd = (): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const y = parts.find((p) => p.type === "year")?.value;
	const m = parts.find((p) => p.type === "month")?.value;
	const d = parts.find((p) => p.type === "day")?.value;
	if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
	return `${y}-${m}-${d}`;
};

/** 플랜 `start_date` + `dayNumber` → 스테이지 달력 날짜(Asia/Seoul). */
const stageTargetYmd = (planStartDate: string | null, dayNumber: number): string => {
	if (planStartDate && /^\d{4}-\d{2}-\d{2}$/.test(planStartDate.trim())) {
		const base = new Date(`${planStartDate.trim()}T12:00:00+09:00`);
		if (!Number.isNaN(base.getTime())) {
			const shifted = new Date(base.getTime() + (dayNumber - 1) * 86400000);
			return new Intl.DateTimeFormat("en-CA", {
				timeZone: "Asia/Seoul",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(shifted);
		}
	}
	return kstTodayYmd();
};

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

	if (!Number.isInteger(dayNumber) || dayNumber < 1) {
		return NextResponse.json({ error: "Invalid dayNumber" }, { status: 400 });
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

	const targetDate = stageTargetYmd(row.start_date, dayNumber);

	const weatherOriginRaw = process.env.WEATHER_SERVICE_ORIGIN?.trim().replace(/\/+$/, "") ?? "";
	const weatherKey = process.env.WEATHER_INTERNAL_API_KEY?.trim();
	if (!weatherOriginRaw || !weatherKey) {
		return NextResponse.json({ error: "Weather service not configured" }, { status: 503 });
	}

	/** 플레이스홀더만 넣은 경우(Vercel에 리터럴 `WEATHER_SERVICE_ORIGIN` 등) 조기 차단 */
	if (/^WEATHER_SERVICE_ORIGIN$/i.test(weatherOriginRaw)) {
		return NextResponse.json(
			{
				error:
					"WEATHER_SERVICE_ORIGIN must be the weather app URL (e.g. https://your-weather.vercel.app), not the variable name.",
			},
			{ status: 503 },
		);
	}

	let weatherStageUrl: string;
	try {
		const base = /^https?:\/\//i.test(weatherOriginRaw)
			? weatherOriginRaw
			: `https://${weatherOriginRaw}`;
		weatherStageUrl = new URL("/api/v1/forecast/stage", base).href;
	} catch {
		return NextResponse.json(
			{ error: "Invalid WEATHER_SERVICE_ORIGIN (must be a valid http(s) origin)" },
			{ status: 503 },
		);
	}

	const wRes = await fetch(weatherStageUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${weatherKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			polyline,
			targetDate,
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
	const parsed = stageBriefingResponseSchema.safeParse(wJson);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid weather response" }, { status: 502 });
	}

	// #region agent log
	const d = parsed.data;
	const line = JSON.stringify({
		sessionId: "b970e4",
		timestamp: Date.now(),
		runId: "repro",
		location: "forecast-along/route.ts",
		message: "stage_ok",
		hypothesisId: "H2-H4",
		data: {
			dayNumber,
			targetDate,
			mode: d.mode,
			points: d.points.length,
			...(d.mode === "mid"
				? { midDailyNonNull: d.points.filter((p) => p.daily != null).length }
				: { hourlyPerPoint: d.points.map((p) => p.hourly.length) }),
		},
	});
	try {
		appendFileSync("/Users/lim/repos/my-ridings/.cursor/debug-b970e4.log", `${line}\n`);
	} catch {
		/* Vercel 등 비로컬에서 경로 없음 */
	}
	fetch("http://127.0.0.1:7721/ingest/5bfe97dd-8e0f-4182-9d17-ebb95859ecdf", {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b970e4" },
		body: line,
	}).catch(() => {});
	// #endregion

	return NextResponse.json(parsed.data);
}
