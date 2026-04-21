import { describe, expect, test } from "bun:test";
import { kstYmdHmToUtcIso, normalizeShortTerm } from "./normalize-short-term";
import type { VilageFcstItem } from "./short-term-schema";

describe("kstYmdHmToUtcIso", () => {
	test("KST 05:00 → UTC 전날 20:00", () => {
		expect(kstYmdHmToUtcIso("20260421", "0500")).toBe("2026-04-20T20:00:00.000Z");
	});

	test("KST 09:00 → UTC 00:00", () => {
		expect(kstYmdHmToUtcIso("20260421", "0900")).toBe("2026-04-21T00:00:00.000Z");
	});

	test("형식 오류면 throw", () => {
		expect(() => kstYmdHmToUtcIso("2026421", "0500")).toThrow();
		expect(() => kstYmdHmToUtcIso("20260421", "500")).toThrow();
	});
});

describe("normalizeShortTerm", () => {
	const base = { baseDate: "20260421", baseTime: "0500", nx: 60, ny: 127 };
	const fixture: VilageFcstItem[] = [
		{ ...base, category: "TMP", fcstDate: "20260421", fcstTime: "0600", fcstValue: "12" },
		{ ...base, category: "POP", fcstDate: "20260421", fcstTime: "0600", fcstValue: "30" },
		{ ...base, category: "SKY", fcstDate: "20260421", fcstTime: "0600", fcstValue: "3" },
		{ ...base, category: "PTY", fcstDate: "20260421", fcstTime: "0600", fcstValue: "0" },
		{ ...base, category: "WSD", fcstDate: "20260421", fcstTime: "0600", fcstValue: "2.3" },
		{ ...base, category: "REH", fcstDate: "20260421", fcstTime: "0600", fcstValue: "55" },
		{ ...base, category: "PCP", fcstDate: "20260421", fcstTime: "0600", fcstValue: "강수없음" },
		{ ...base, category: "SNO", fcstDate: "20260421", fcstTime: "0600", fcstValue: "적설없음" },
		{ ...base, category: "TMP", fcstDate: "20260421", fcstTime: "0700", fcstValue: "13" },
		{ ...base, category: "PCP", fcstDate: "20260421", fcstTime: "0700", fcstValue: "1mm 미만" },
	];

	test("한 시각당 한 행으로 합쳐지고 KST→UTC 변환된다", () => {
		const r = normalizeShortTerm(fixture);
		expect(r).not.toBeNull();
		if (!r) return;
		expect(r.nx).toBe(60);
		expect(r.ny).toBe(127);
		expect(r.baseAt).toBe("2026-04-20T20:00:00.000Z");
		expect(r.hourly).toHaveLength(2);
		expect(r.hourly[0]).toEqual({
			forecastAt: "2026-04-20T21:00:00.000Z",
			tempC: 12,
			popPct: 30,
			sky: 3,
			pty: 0,
			windMs: 2.3,
			humidityPct: 55,
			rainMm: 0,
			snowCm: 0,
		});
		expect(r.hourly[1].tempC).toBe(13);
		expect(r.hourly[1].rainMm).toBe(0.5);
	});

	test("아이템 0개면 null", () => {
		expect(normalizeShortTerm([])).toBeNull();
	});
});
