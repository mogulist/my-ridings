import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dailyForecastQuerySchema = z.object({
	lat: z.coerce.number().min(31).max(45),
	lng: z.coerce.number().min(120).max(135),
	from: isoDate,
	to: isoDate,
});
export type DailyForecastQuery = z.infer<typeof dailyForecastQuerySchema>;

export const dailyRowSchema = z.object({
	date: isoDate,
	tmn: z.number().nullable(),
	tmx: z.number().nullable(),
	amSky: z.string().nullable(),
	pmSky: z.string().nullable(),
	amPop: z.number().nullable(),
	pmPop: z.number().nullable(),
});
export type DailyRow = z.infer<typeof dailyRowSchema>;

export const dailyForecastResponseSchema = z.object({
	regionLandCode: z.string(),
	regionTempCode: z.string(),
	baseAt: z.string().datetime().nullable(),
	days: z.array(dailyRowSchema),
});
export type DailyForecastResponse = z.infer<typeof dailyForecastResponseSchema>;
