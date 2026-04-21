import { describe, expect, test } from "bun:test";
import { forecastYmdFromTmFc } from "./mid-term-dates";

describe("forecastYmdFromTmFc", () => {
	test("발표일 KST 2026-04-21 + 0일 → 2026-04-21", () => {
		expect(forecastYmdFromTmFc("202604210600", 0)).toBe("2026-04-21");
	});

	test("dayOffset 3 → 3일 후", () => {
		expect(forecastYmdFromTmFc("202604210600", 3)).toBe("2026-04-24");
	});

	test("월 경계", () => {
		expect(forecastYmdFromTmFc("202604280600", 5)).toBe("2026-05-03");
	});
});
