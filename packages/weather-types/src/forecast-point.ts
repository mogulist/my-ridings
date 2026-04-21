import { z } from "zod";

export const pointForecastQuerySchema = z.object({
	lat: z.coerce.number().min(31).max(45),
	lng: z.coerce.number().min(120).max(135),
	from: z.string().datetime(),
	to: z.string().datetime(),
});
export type PointForecastQuery = z.infer<typeof pointForecastQuerySchema>;

export const hourlyForecastSchema = z.object({
	at: z.string().datetime(),
	tempC: z.number().nullable(),
	popPct: z.number().nullable(),
	sky: z.number().nullable(),
	pty: z.number().nullable(),
	windMs: z.number().nullable(),
	humidityPct: z.number().nullable(),
	rainMm: z.number().nullable(),
	snowCm: z.number().nullable(),
});
export type HourlyForecast = z.infer<typeof hourlyForecastSchema>;

export const pointForecastResponseSchema = z.object({
	grid: z.object({
		nx: z.number().int(),
		ny: z.number().int(),
		lat: z.number(),
		lng: z.number(),
	}),
	baseAt: z.string().datetime().nullable(),
	hourly: z.array(hourlyForecastSchema),
});
export type PointForecastResponse = z.infer<typeof pointForecastResponseSchema>;
