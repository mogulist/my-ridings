import { describe, expect, test } from "bun:test";
import { PLAN_REVIEW_NOTE_MAX_LENGTH, parsePlanReviewNote } from "./plan-review-note";

describe("parsePlanReviewNote", () => {
	test("앞뒤 공백을 제거하고 빈 메모를 null로 정규화한다", () => {
		expect(parsePlanReviewNote("  후보 1순위  ")).toEqual({
			ok: true,
			value: "후보 1순위",
		});
		expect(parsePlanReviewNote("   ")).toEqual({ ok: true, value: null });
		expect(parsePlanReviewNote(null)).toEqual({ ok: true, value: null });
	});

	test("문자열이 아니거나 너무 긴 메모를 거부한다", () => {
		expect(parsePlanReviewNote(123).ok).toBe(false);
		expect(parsePlanReviewNote("가".repeat(PLAN_REVIEW_NOTE_MAX_LENGTH + 1)).ok).toBe(false);
	});
});
