import { latLngToGrid } from "@my-ridings/weather-grid";
import { dailyForecastQuerySchema, dailyForecastResponseSchema } from "@my-ridings/weather-types";
import { and, eq, gte, lte, max } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { weatherGridMeta, weatherMidTerm } from "@/db/schema";
import { requireInternalAuth } from "@/lib/require-internal-auth";

const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

export async function GET(req: NextRequest) {
	const deny = requireInternalAuth(req);
	if (deny) return deny;
	const q = dailyForecastQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
	if (!q.success) {
		return Response.json({ error: q.error.flatten() }, { status: 400 });
	}
	const { lat, lng, from, to } = q.data;
	const { nx, ny } = latLngToGrid(lat, lng);
	const [meta] = await db
		.select({
			land: weatherGridMeta.midRegionLand,
			temp: weatherGridMeta.midRegionTemp,
		})
		.from(weatherGridMeta)
		.where(and(eq(weatherGridMeta.nx, nx), eq(weatherGridMeta.ny, ny)))
		.limit(1);
	const land = meta?.land ?? null;
	const temp = meta?.temp ?? null;
	if (!land || !temp) {
		const body = dailyForecastResponseSchema.parse({
			regionLandCode: land ?? "",
			regionTempCode: temp ?? "",
			baseAt: null,
			days: [],
		});
		return Response.json(body, { headers: { "Cache-Control": CACHE } });
	}
	const [agg] = await db
		.select({ maxBase: max(weatherMidTerm.baseAt) })
		.from(weatherMidTerm)
		.where(
			and(
				eq(weatherMidTerm.regionLandCode, land),
				eq(weatherMidTerm.regionTempCode, temp),
				gte(weatherMidTerm.forecastDate, from),
				lte(weatherMidTerm.forecastDate, to),
			),
		);
	const maxBase = agg?.maxBase;
	if (!maxBase) {
		const body = dailyForecastResponseSchema.parse({
			regionLandCode: land,
			regionTempCode: temp,
			baseAt: null,
			days: [],
		});
		return Response.json(body, { headers: { "Cache-Control": CACHE } });
	}
	const rows = await db
		.select()
		.from(weatherMidTerm)
		.where(
			and(
				eq(weatherMidTerm.regionLandCode, land),
				eq(weatherMidTerm.regionTempCode, temp),
				eq(weatherMidTerm.baseAt, maxBase),
				gte(weatherMidTerm.forecastDate, from),
				lte(weatherMidTerm.forecastDate, to),
			),
		)
		.orderBy(weatherMidTerm.forecastDate);
	const body = dailyForecastResponseSchema.parse({
		regionLandCode: land,
		regionTempCode: temp,
		baseAt: maxBase.toISOString(),
		days: rows.map((r) => ({
			date: String(r.forecastDate).slice(0, 10),
			tmn: r.tmn,
			tmx: r.tmx,
			amSky: r.amSky,
			pmSky: r.pmSky,
			amPop: r.amPop,
			pmPop: r.pmPop,
		})),
	});
	return Response.json(body, { headers: { "Cache-Control": CACHE } });
}
