import type { DailyRow } from "@my-ridings/weather-types";
import { and, eq, gte, lte, max } from "drizzle-orm";
import { db } from "@/db";
import { weatherGridMeta, weatherMidTerm } from "@/db/schema";

/** (nx,ny) 격자의 중기 **해당 일** 1행 (없으면 null). */
export const getMidTermDailyRowForYmd = async (
	nx: number,
	ny: number,
	ymd: string,
): Promise<DailyRow | null> => {
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
		return null;
	}
	const [agg] = await db
		.select({ maxBase: max(weatherMidTerm.baseAt) })
		.from(weatherMidTerm)
		.where(
			and(
				eq(weatherMidTerm.regionLandCode, land),
				eq(weatherMidTerm.regionTempCode, temp),
				gte(weatherMidTerm.forecastDate, ymd),
				lte(weatherMidTerm.forecastDate, ymd),
			),
		);
	if (!agg?.maxBase) {
		return null;
	}
	const [row] = await db
		.select()
		.from(weatherMidTerm)
		.where(
			and(
				eq(weatherMidTerm.regionLandCode, land),
				eq(weatherMidTerm.regionTempCode, temp),
				eq(weatherMidTerm.baseAt, agg.maxBase),
				gte(weatherMidTerm.forecastDate, ymd),
				lte(weatherMidTerm.forecastDate, ymd),
			),
		)
		.limit(1);
	if (!row) {
		return null;
	}
	return {
		date: String(row.forecastDate).slice(0, 10),
		tmn: row.tmn,
		tmx: row.tmx,
		amSky: row.amSky,
		pmSky: row.pmSky,
		amPop: row.amPop,
		pmPop: row.pmPop,
	};
};
