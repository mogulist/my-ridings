import { z } from "zod";

import { dailyRowSchema } from "./forecast-daily";
import { hourlyForecastSchema } from "./forecast-point";

const latLngTuple = z.tuple([z.number(), z.number()]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** POST /api/v1/forecast/stage — 경로 상 5지점(0/25/50/75/100%) 브리핑 */
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

const stagePointBaseSchema = z.object({
	index: z.number().int().min(0).max(4),
	kmAlong: z.number(),
	/** 예보 격자 식별용 표시 문자열 */
	gridLabel: z.string(),
	nx: z.number().int(),
	ny: z.number().int(),
	midpoint: midpointSchema,
});

export const scrollAnchorLocalHourSchema = z.union([
	z.literal(6),
	z.literal(10),
	z.literal(14),
	z.literal(17),
	z.literal(20),
]);
export type ScrollAnchorLocalHour = z.infer<typeof scrollAnchorLocalHourSchema>;

export const stageMidPointSchema = stagePointBaseSchema.extend({
	/** targetDate에 대한 중기 일별(없으면 null) */
	daily: dailyRowSchema.nullable(),
});
export type StageMidPoint = z.infer<typeof stageMidPointSchema>;

export const stageShortPointSchema = stagePointBaseSchema.extend({
	scrollAnchorLocalHour: scrollAnchorLocalHourSchema,
	/** 06:00~20:59 KST 구간(해당 targetDate) 시간별 */
	hourly: z.array(hourlyForecastSchema),
});
export type StageShortPoint = z.infer<typeof stageShortPointSchema>;

export const stageBriefingMidResponseSchema = z.object({
	mode: z.literal("mid"),
	targetDate: isoDate,
	totalKm: z.number(),
	points: z.array(stageMidPointSchema),
});
export type StageBriefingMidResponse = z.infer<typeof stageBriefingMidResponseSchema>;

export const stageBriefingShortResponseSchema = z.object({
	mode: z.literal("short"),
	targetDate: isoDate,
	totalKm: z.number(),
	points: z.array(stageShortPointSchema),
});
export type StageBriefingShortResponse = z.infer<typeof stageBriefingShortResponseSchema>;

export const stageBriefingResponseSchema = z.discriminatedUnion("mode", [
	stageBriefingMidResponseSchema,
	stageBriefingShortResponseSchema,
]);
export type StageBriefingResponse = z.infer<typeof stageBriefingResponseSchema>;
