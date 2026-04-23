import {
	date,
	index,
	integer,
	numeric,
	pgSchema,
	primaryKey,
	serial,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

const weather = pgSchema("weather");

export const weatherGridMeta = weather.table(
	"weather_grid_meta",
	{
		nx: integer("nx").notNull(),
		ny: integer("ny").notNull(),
		lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
		lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
		midRegionLand: text("mid_region_land"),
		midRegionTemp: text("mid_region_temp"),
		regionName: text("region_name"),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.nx, t.ny] }),
	}),
);

export const weatherShortTerm = weather.table(
	"weather_short_term",
	{
		nx: integer("nx").notNull(),
		ny: integer("ny").notNull(),
		forecastAt: timestamp("forecast_at", { withTimezone: true }).notNull(),
		baseAt: timestamp("base_at", { withTimezone: true }).notNull(),
		tempC: numeric("temp_c", { precision: 5, scale: 2 }),
		popPct: integer("pop_pct"),
		sky: smallint("sky"),
		pty: smallint("pty"),
		windMs: numeric("wind_ms", { precision: 6, scale: 2 }),
		humidityPct: integer("humidity_pct"),
		rainMm: numeric("rain_mm", { precision: 8, scale: 3 }),
		snowCm: numeric("snow_cm", { precision: 8, scale: 3 }),
		ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.nx, t.ny, t.forecastAt, t.baseAt] }),
		forecastIdx: index("weather_short_term_nx_ny_forecast_at_idx").on(t.nx, t.ny, t.forecastAt),
	}),
);

export const weatherMidTerm = weather.table(
	"weather_mid_term",
	{
		regionLandCode: text("region_land_code").notNull(),
		regionTempCode: text("region_temp_code").notNull(),
		forecastDate: date("forecast_date").notNull(),
		baseAt: timestamp("base_at", { withTimezone: true }).notNull(),
		tmn: integer("tmn"),
		tmx: integer("tmx"),
		amSky: text("am_sky"),
		pmSky: text("pm_sky"),
		amPop: integer("am_pop"),
		pmPop: integer("pm_pop"),
		ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => ({
		pk: primaryKey({
			columns: [t.regionLandCode, t.regionTempCode, t.forecastDate, t.baseAt],
		}),
	}),
);

export const trackedGrids = weather.table(
	"tracked_grids",
	{
		nx: integer("nx").notNull(),
		ny: integer("ny").notNull(),
		reason: text("reason"),
		lastRequestedAt: timestamp("last_requested_at", { withTimezone: true }).defaultNow().notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.nx, t.ny] }),
	}),
);

export const ingestRuns = weather.table("ingest_runs", {
	id: serial("id").primaryKey(),
	kind: text("kind").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true }),
	baseAt: timestamp("base_at", { withTimezone: true }),
	cellsRequested: integer("cells_requested"),
	cellsSucceeded: integer("cells_succeeded"),
	cellsFailed: integer("cells_failed"),
	errorSummary: text("error_summary"),
});
