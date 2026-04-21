import { describe, expect, test } from "bun:test";
import { kstTmFcToUtcIso, normalizeMidTerm } from "./normalize-mid-term";

describe("kstTmFcToUtcIso", () => {
	test("KST 2026-04-21 06:00 → UTC 2026-04-20 21:00", () => {
		expect(kstTmFcToUtcIso("202604210600")).toBe("2026-04-20T21:00:00.000Z");
	});

	test("형식 오류면 throw", () => {
		expect(() => kstTmFcToUtcIso("20260421")).toThrow();
	});
});

describe("normalizeMidTerm", () => {
	test("육상·기온 아이템을 결합해 3~10일 days[]를 만든다", () => {
		const r = normalizeMidTerm({
			regLandCode: "11B00000",
			regTempCode: "11B10101",
			tmFc: "202604210600",
			land: {
				regId: "11B00000",
				rnSt3Am: 30,
				rnSt3Pm: 50,
				wf3Am: "구름많음",
				wf3Pm: "비",
				rnSt8: 40,
				wf8: "흐림",
			},
			ta: {
				regId: "11B10101",
				taMin3: 8,
				taMax3: 16,
				taMin8: 10,
				taMax8: 18,
			},
		});
		expect(r.baseAt).toBe("2026-04-20T21:00:00.000Z");
		expect(r.days).toHaveLength(8);
		const d3 = r.days.find((d) => d.dayOffset === 3);
		expect(d3).toEqual({
			dayOffset: 3,
			tmn: 8,
			tmx: 16,
			amSky: "구름많음",
			pmSky: "비",
			amPop: 30,
			pmPop: 50,
		});
		const d8 = r.days.find((d) => d.dayOffset === 8);
		expect(d8?.amPop).toBe(40);
		expect(d8?.pmPop).toBe(40);
		expect(d8?.amSky).toBe("흐림");
		expect(d8?.pmSky).toBe("흐림");
		expect(d8?.tmn).toBe(10);
	});

	test("해당 offset 데이터가 없으면 null", () => {
		const r = normalizeMidTerm({
			regLandCode: "X",
			regTempCode: "Y",
			tmFc: "202604210600",
			land: undefined,
			ta: undefined,
		});
		for (const d of r.days) {
			expect(d.tmn).toBeNull();
			expect(d.amSky).toBeNull();
			expect(d.amPop).toBeNull();
		}
	});
});
