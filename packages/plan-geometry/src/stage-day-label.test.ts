import { describe, expect, test } from "bun:test";
import { stageDayLabel } from "./stage-day-label";

describe("stageDayLabel", () => {
	test("시작일 없으면 빈 문자열", () => {
		expect(stageDayLabel(1, null)).toBe("");
		expect(stageDayLabel(1, undefined)).toBe("");
	});

	test("2026-01-05(월) 시작일의 1일차는 1.5(월)", () => {
		expect(stageDayLabel(1, "2026-01-05")).toBe("1.5(월)");
	});

	test("2일차는 하루 더함", () => {
		expect(stageDayLabel(2, "2026-01-05")).toBe("1.6(화)");
	});
});
