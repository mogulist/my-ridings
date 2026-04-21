import type { NormalizedShortTerm } from "@my-ridings/kma-client";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type Db = PostgresJsDatabase<typeof schema>;

export const rowsFromNormalizedShortTerm = (n: NormalizedShortTerm) => {
	const baseAt = new Date(n.baseAt);
	return n.hourly.map((h) => ({
		nx: n.nx,
		ny: n.ny,
		forecastAt: new Date(h.forecastAt),
		baseAt,
		tempC: h.tempC != null ? String(h.tempC) : null,
		popPct: h.popPct,
		sky: h.sky != null ? h.sky : null,
		pty: h.pty != null ? h.pty : null,
		windMs: h.windMs != null ? String(h.windMs) : null,
		humidityPct: h.humidityPct,
		rainMm: h.rainMm != null ? String(h.rainMm) : null,
		snowCm: h.snowCm != null ? String(h.snowCm) : null,
	}));
};

export const upsertShortTermRows = async (
	db: Db,
	rows: ReturnType<typeof rowsFromNormalizedShortTerm>,
) => {
	const { weatherShortTerm } = schema;
	const BATCH = 200;
	for (let i = 0; i < rows.length; i += BATCH) {
		const chunk = rows.slice(i, i + BATCH);
		if (chunk.length === 0) continue;
		await db
			.insert(weatherShortTerm)
			.values(chunk)
			.onConflictDoUpdate({
				target: [
					weatherShortTerm.nx,
					weatherShortTerm.ny,
					weatherShortTerm.forecastAt,
					weatherShortTerm.baseAt,
				],
				set: {
					tempC: sql`excluded.temp_c`,
					popPct: sql`excluded.pop_pct`,
					sky: sql`excluded.sky`,
					pty: sql`excluded.pty`,
					windMs: sql`excluded.wind_ms`,
					humidityPct: sql`excluded.humidity_pct`,
					rainMm: sql`excluded.rain_mm`,
					snowCm: sql`excluded.snow_cm`,
					ingestedAt: sql`excluded.ingested_at`,
				},
			});
	}
};
