import { z } from "zod";

const latLngTuple = z.tuple([z.number(), z.number()]);

export const alongForecastBodySchema = z.object({
	polyline: z.array(latLngTuple).min(2),
	segments: z.coerce.number().int().min(1).max(24).default(4),
	departAt: z.string().datetime(),
	paceKmh: z.coerce.number().positive().max(80),
});
export type AlongForecastBody = z.infer<typeof alongForecastBodySchema>;

export const alongSegmentSchema = z.object({
	index: z.number().int(),
	fromKm: z.number(),
	toKm: z.number(),
	midpoint: z.object({ lat: z.number(), lng: z.number() }),
	etaAt: z.string().datetime(),
	grid: z.object({ nx: z.number().int(), ny: z.number().int() }),
	forecast: z.object({
		baseAt: z.string().datetime().nullable(),
		tempC: z.number().nullable(),
		popPct: z.number().nullable(),
		sky: z.number().nullable(),
		pty: z.number().nullable(),
		windMs: z.number().nullable(),
		humidityPct: z.number().nullable(),
		rainMm: z.number().nullable(),
		snowCm: z.number().nullable(),
	}),
});
export type AlongSegment = z.infer<typeof alongSegmentSchema>;

export const alongForecastResponseSchema = z.object({
	totalKm: z.number(),
	segments: z.array(alongSegmentSchema),
});
export type AlongForecastResponse = z.infer<typeof alongForecastResponseSchema>;
