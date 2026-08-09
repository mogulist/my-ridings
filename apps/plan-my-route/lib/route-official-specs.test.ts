import { describe, expect, test } from "bun:test";
import type { BriefingGeometry } from "@/app/components/plan-elevation/course-briefing/build-briefing-geometry";
import type { RouteOfficialSpecs } from "@/app/types/route";
import {
	applyBriefingDisplayOverrides,
	canToggleBriefingElevationSource,
	defaultBriefingElevationSource,
	hasOfficialElevation,
} from "./route-official-specs";

const baseGeometry: BriefingGeometry = {
	viewWidth: 1920,
	viewHeight: 1080,
	chartLeft: 120,
	chartTop: 520,
	chartWidth: 1680,
	chartHeight: 380,
	areaPath: "M 0 0",
	linePath: "M 0 0",
	startX: 120,
	startY: 600,
	endX: 1800,
	endY: 700,
	startElevation: 100,
	endElevation: 200,
	startName: "Stage Start",
	endName: "Stage Finish",
	totalDistanceKm: 183,
	elevationGainM: 1830,
	summits: [],
	summitLabelUpliftPx: 0,
};

const officialSpecs: RouteOfficialSpecs = {
	officialDistanceKm: 209,
	officialElevationM: 2099,
	officialStartName: "Official Start",
	officialFinishName: "Official Finish",
};

describe("route-official-specs", () => {
	test("hasOfficialElevation", () => {
		expect(hasOfficialElevation(officialSpecs)).toBe(true);
		expect(hasOfficialElevation({ ...officialSpecs, officialElevationM: 0 })).toBe(
			false,
		);
	});

	test("defaultBriefingElevationSource", () => {
		expect(defaultBriefingElevationSource(officialSpecs)).toBe("official");
		expect(defaultBriefingElevationSource(null)).toBe("measured");
	});

	test("canToggleBriefingElevationSource — 전체 구간만", () => {
		expect(canToggleBriefingElevationSource(officialSpecs, true)).toBe(true);
		expect(canToggleBriefingElevationSource(officialSpecs, false)).toBe(false);
	});

	test("applyBriefingDisplayOverrides — 공식 소스", () => {
		const applied = applyBriefingDisplayOverrides(
			baseGeometry,
			officialSpecs,
			"official",
			true,
		);
		expect(applied.elevationGainM).toBe(2099);
		expect(applied.totalDistanceKm).toBe(209);
		expect(applied.startName).toBe("Official Start");
		expect(applied.endName).toBe("Official Finish");
	});

	test("applyBriefingDisplayOverrides — 실측 소스", () => {
		const applied = applyBriefingDisplayOverrides(
			baseGeometry,
			officialSpecs,
			"measured",
			true,
		);
		expect(applied.elevationGainM).toBe(1830);
		expect(applied.startName).toBe("Stage Start");
	});

	test("applyBriefingDisplayOverrides — 일차 구간은 무시", () => {
		const applied = applyBriefingDisplayOverrides(
			baseGeometry,
			officialSpecs,
			"official",
			false,
		);
		expect(applied).toEqual(baseGeometry);
	});
});
