CREATE SCHEMA IF NOT EXISTS "weather";
--> statement-breakpoint
CREATE TABLE "weather"."ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"base_at" timestamp with time zone,
	"cells_requested" integer,
	"cells_succeeded" integer,
	"cells_failed" integer,
	"error_summary" text
);
--> statement-breakpoint
CREATE TABLE "weather"."tracked_grids" (
	"nx" integer NOT NULL,
	"ny" integer NOT NULL,
	"reason" text,
	"last_requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "tracked_grids_nx_ny_pk" PRIMARY KEY("nx","ny")
);
--> statement-breakpoint
CREATE TABLE "weather"."weather_grid_meta" (
	"nx" integer NOT NULL,
	"ny" integer NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"mid_region_land" text,
	"mid_region_temp" text,
	CONSTRAINT "weather_grid_meta_nx_ny_pk" PRIMARY KEY("nx","ny")
);
--> statement-breakpoint
CREATE TABLE "weather"."weather_mid_term" (
	"region_land_code" text NOT NULL,
	"region_temp_code" text NOT NULL,
	"forecast_date" date NOT NULL,
	"base_at" timestamp with time zone NOT NULL,
	"tmn" integer,
	"tmx" integer,
	"am_sky" text,
	"pm_sky" text,
	"am_pop" integer,
	"pm_pop" integer,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_mid_term_region_land_code_region_temp_code_forecast_date_base_at_pk" PRIMARY KEY("region_land_code","region_temp_code","forecast_date","base_at")
);
--> statement-breakpoint
CREATE TABLE "weather"."weather_short_term" (
	"nx" integer NOT NULL,
	"ny" integer NOT NULL,
	"forecast_at" timestamp with time zone NOT NULL,
	"base_at" timestamp with time zone NOT NULL,
	"temp_c" numeric(5, 2),
	"pop_pct" integer,
	"sky" smallint,
	"pty" smallint,
	"wind_ms" numeric(6, 2),
	"humidity_pct" integer,
	"rain_mm" numeric(8, 3),
	"snow_cm" numeric(8, 3),
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_short_term_nx_ny_forecast_at_base_at_pk" PRIMARY KEY("nx","ny","forecast_at","base_at")
);
--> statement-breakpoint
CREATE INDEX "weather_short_term_nx_ny_forecast_at_idx" ON "weather"."weather_short_term" USING btree ("nx","ny","forecast_at");