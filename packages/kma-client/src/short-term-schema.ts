import { z } from "zod";

/**
 * 기상청 단기예보(getVilageFcst) 응답 스키마.
 *
 * 공식 응답 포맷:
 *   { response: { header: { resultCode, resultMsg }, body: { items: { item: [...] } } } }
 */
export const vilageFcstItemSchema = z.object({
	baseDate: z.string(),
	baseTime: z.string(),
	category: z.string(),
	fcstDate: z.string(),
	fcstTime: z.string(),
	fcstValue: z.union([z.string(), z.number()]),
	nx: z.number(),
	ny: z.number(),
});
export type VilageFcstItem = z.infer<typeof vilageFcstItemSchema>;

export const vilageFcstResponseSchema = z.object({
	response: z.object({
		header: z.object({
			resultCode: z.string(),
			resultMsg: z.string(),
		}),
		body: z
			.object({
				items: z
					.object({
						item: z.array(vilageFcstItemSchema).default([]),
					})
					.optional(),
			})
			.optional(),
	}),
});
export type VilageFcstResponse = z.infer<typeof vilageFcstResponseSchema>;
