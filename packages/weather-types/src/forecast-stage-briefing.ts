import { z } from "zod";

import { dailyRowSchema } from "./forecast-daily";
import { hourlyForecastSchema } from "./forecast-point";

const latLngTuple = z.tuple([z.number(), z.number()]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** POST /api/v1/forecast/stage — 경로를 따라 격자별 브리핑 */
export const stageBriefingBodySchema = z.object({
	polyline: z.array(latLngTuple).min(2),
	/** 스테이지 당일 (KST 달력 기준 비교) */
	targetDate: isoDate,
});
export type StageBriefingBody = z.infer<typeof stageBriefingBodySchema>;

const midpointSchema = z.object({
	lat: z.number(),
	lng: z.number(),
});

export const stagePointPositionSchema = z.enum(["departure", "along", "arrival"]);
export type StagePointPosition = z.infer<typeof stagePointPositionSchema>;

const stagePointBaseSchema = z.object({
	index: z.number().int().min(0),
	position: stagePointPositionSchema,
	/** 스테이지 출발 기준 누적 km 구간 [kmFrom, kmTo] */
	kmFrom: z.number(),
	kmTo: z.number(),
	/** weather_grid_meta.region_name, DB에 없으면 null */
	regionName: z.string().nullable(),
	nx: z.number().int(),
	ny: z.number().int(),
	midpoint: midpointSchema,
});

export const stageMidPointSchema = stagePointBaseSchema.extend({
	/** targetDate에 대한 중기 일별(없으면 null) */
	daily: dailyRowSchema.nullable(),
});
export type StageMidPoint = z.infer<typeof stageMidPointSchema>;

export const stageShortPointSchema = stagePointBaseSchema.extend({
	/** 03:00~23:59 KST(해당 targetDate) 시간별, 시 서버에서 필터 */
	hourly: z.array(hourlyForecastSchema),
});
export type StageShortPoint = z.infer<typeof stageShortPointSchema>;

export const stageBriefingMidResponseSchema = z.object({
	mode: z.literal("mid"),
	targetDate: isoDate,
	totalKm: z.number(),
	/** 격자별 예보에 사용된 기상청 발표 시각(UTC ISO) 중 가장 이른 값 — 없으면 null */
	forecastBaseAt: z.string().datetime().nullable().optional(),
	/** 경로를 따라 격자 구간마다 1행 */
	points: z.array(stageMidPointSchema),
});
export type StageBriefingMidResponse = z.infer<typeof stageBriefingMidResponseSchema>;

export const stageBriefingShortResponseSchema = z.object({
	mode: z.literal("short"),
	targetDate: isoDate,
	totalKm: z.number(),
	/** 격자별 단기예보 `baseAt`(UTC ISO) 중 가장 이른 값 — 없으면 null */
	forecastBaseAt: z.string().datetime().nullable().optional(),
	points: z.array(stageShortPointSchema),
});
export type StageBriefingShortResponse = z.infer<typeof stageBriefingShortResponseSchema>;

export const stageBriefingResponseSchema = z.discriminatedUnion("mode", [
	stageBriefingMidResponseSchema,
	stageBriefingShortResponseSchema,
]);
export type StageBriefingResponse = z.infer<typeof stageBriefingResponseSchema>;
