import { z } from "zod";

/**
 * 중기예보 — 육상 (getMidLandFcst). 1개의 item 안에 D+3..D+10 필드가 한 번에 담긴다.
 * 필드 이름 규칙:
 *   rnSt{N}Am/Pm   → N일 후 오전/오후 강수확률 (3~7일)
 *   rnSt{N}        → N일 후 강수확률 (8~10일)
 *   wf{N}Am/Pm     → N일 후 오전/오후 날씨 문구
 *   wf{N}          → N일 후 날씨 문구 (8~10일)
 */
export const midLandItemSchema = z
	.object({
		regId: z.string(),
	})
	.catchall(z.union([z.string(), z.number()]));
export type MidLandItem = z.infer<typeof midLandItemSchema>;

export const midLandResponseSchema = z.object({
	response: z.object({
		header: z.object({ resultCode: z.string(), resultMsg: z.string() }),
		body: z
			.object({
				items: z.object({ item: z.array(midLandItemSchema).default([]) }).optional(),
			})
			.optional(),
	}),
});

/** 중기예보 — 기온 (getMidTa): taMin{N}, taMax{N} (3~10) */
export const midTaItemSchema = z
	.object({ regId: z.string() })
	.catchall(z.union([z.string(), z.number()]));
export type MidTaItem = z.infer<typeof midTaItemSchema>;

export const midTaResponseSchema = z.object({
	response: z.object({
		header: z.object({ resultCode: z.string(), resultMsg: z.string() }),
		body: z
			.object({
				items: z.object({ item: z.array(midTaItemSchema).default([]) }).optional(),
			})
			.optional(),
	}),
});
