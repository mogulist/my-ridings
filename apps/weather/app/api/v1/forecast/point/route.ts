import { latLngToGrid } from "@my-ridings/weather-grid";
import { pointForecastQuerySchema, pointForecastResponseSchema } from "@my-ridings/weather-types";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { weatherGridMeta } from "@/db/schema";
import { requireInternalAuth } from "@/lib/require-internal-auth";
import {
	etagForRows,
	latestBaseAtInWindow,
	numToNullable,
	rowsForLatestBase,
} from "@/lib/short-term-read";

const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

export async function GET(req: NextRequest) {
	const deny = requireInternalAuth(req);
	if (deny) return deny;
	const q = pointForecastQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
	if (!q.success) {
		return Response.json({ error: q.error.flatten() }, { status: 400 });
	}
	const { lat, lng, from, to } = q.data;
	const fromD = new Date(from);
	const toD = new Date(to);
	const { nx, ny } = latLngToGrid(lat, lng);
	const [meta] = await db
		.select({ lat: weatherGridMeta.lat, lng: weatherGridMeta.lng })
		.from(weatherGridMeta)
		.where(and(eq(weatherGridMeta.nx, nx), eq(weatherGridMeta.ny, ny)))
		.limit(1);
	const gridLat = meta?.lat != null ? Number(meta.lat) : lat;
	const gridLng = meta?.lng != null ? Number(meta.lng) : lng;
	const maxBase = await latestBaseAtInWindow(db, nx, ny, fromD, toD);
	if (!maxBase) {
		const body = pointForecastResponseSchema.parse({
			grid: { nx, ny, lat: gridLat, lng: gridLng },
			baseAt: null,
			hourly: [],
		});
		return Response.json(body, {
			headers: { "Cache-Control": CACHE },
		});
	}
	const rows = await rowsForLatestBase(db, nx, ny, fromD, toD, maxBase);
	const etag = etagForRows(rows);
	if (req.headers.get("if-none-match") === etag) {
		return new Response(null, { status: 304, headers: { "Cache-Control": CACHE, ETag: etag } });
	}
	const body = pointForecastResponseSchema.parse({
		grid: { nx, ny, lat: gridLat, lng: gridLng },
		baseAt: maxBase.toISOString(),
		hourly: rows.map((r) => ({
			at: r.forecastAt.toISOString(),
			tempC: numToNullable(r.tempC),
			popPct: r.popPct,
			sky: r.sky,
			pty: r.pty,
			windMs: numToNullable(r.windMs),
			humidityPct: r.humidityPct,
			rainMm: numToNullable(r.rainMm),
			snowCm: numToNullable(r.snowCm),
		})),
	});
	return Response.json(body, {
		headers: { "Cache-Control": CACHE, ETag: etag },
	});
}
