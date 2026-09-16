import { describe, expect, test } from "bun:test";

import type { MobilePlanStageRow, PlanItem } from "@/features/api/plan-my-route";
import { buildPlanComparisonSummary } from "./plan-comparison";

const stage = (overrides: Partial<MobilePlanStageRow>): MobilePlanStageRow => ({
	id: "stage",
	title: null,
	start_distance: 0,
	end_distance: 0,
	elevation_gain: 0,
	elevation_loss: 0,
	memo: null,
	start_name: null,
	end_name: null,
	...overrides,
});

describe("buildPlanComparisonSummary", () => {
	test("스테이지를 경로 순서로 정렬하고 합계를 계산한다", () => {
		const plan: PlanItem = {
			id: "plan",
			name: "동해안 3일",
			stages: [
				stage({ id: "day-2", start_distance: 150_000, end_distance: 380_000, elevation_gain: 2100, end_name: "영주" }),
				stage({ id: "day-1", start_distance: 0, end_distance: 150_000, elevation_gain: 1300.4, end_name: " 인제 " }),
			],
		};

		expect(buildPlanComparisonSummary(plan)).toEqual({
			dayCount: 2,
			totalDistanceKm: 380,
			totalElevationGainM: 3400,
			stages: [
				{ dayNumber: 1, distanceKm: 150, elevationGainM: 1300, endName: "인제" },
				{ dayNumber: 2, distanceKm: 230, elevationGainM: 2100, endName: "영주" },
			],
		});
	});

	test("잘못된 거리와 빈 종료 지점을 안전하게 처리한다", () => {
		const plan: PlanItem = {
			id: "plan",
			name: "미완성",
			stages: [stage({ start_distance: 200_000, end_distance: 150_000, elevation_gain: -10, end_name: " " })],
		};

		expect(buildPlanComparisonSummary(plan).stages[0]).toEqual({
			dayNumber: 1,
			distanceKm: 0,
			elevationGainM: 0,
			endName: null,
		});
	});
});
