import type { DailyRow } from "@my-ridings/weather-types";
import { and, eq, gte, lte, max } from "drizzle-orm";
import { db } from "@/db";
import { weatherGridMeta, weatherMidTerm } from "@/db/schema";

export type MidTermDailyForYmd = {
	daily: DailyRow | null;
	/** 해당 일 예보에 쓰인 `weather_mid_term.base_at` (없으면 null) */
	baseAt: Date | null;
};

/** (nx,ny) 격자의 중기 **해당 일** 1행 (없으면 null) + 발표 시각. */
export const getMidTermDailyRowForYmd = async (
	nx: number,
	ny: number,
	ymd: string,
): Promise<MidTermDailyForYmd> => {
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
		return { daily: null, baseAt: null };
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
		return { daily: null, baseAt: null };
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
		return { daily: null, baseAt: agg.maxBase };
	}
	return {
		daily: {
			date: String(row.forecastDate).slice(0, 10),
			tmn: row.tmn,
			tmx: row.tmx,
			amSky: row.amSky,
			pmSky: row.pmSky,
			amPop: row.amPop,
			pmPop: row.pmPop,
		},
		baseAt: agg.maxBase,
	};
};
