import { describe, expect, test } from "bun:test";
import { planPoiBelongsToStage, type SnappedPlanPoi, snapPlanPoisToTrack } from "./snap-plan-pois";

const stage1 = { id: "stage-1", startDistanceKm: 0, endDistanceKm: 100 };
const stage2 = { id: "stage-2", startDistanceKm: 100, endDistanceKm: 200 };

const poi = (overrides: Partial<SnappedPlanPoi>): SnappedPlanPoi => ({
	id: "poi-1",
	name: "숙소",
	poiType: "accommodation",
	memo: null,
	distanceKm: 101,
	elevation: 100,
	assignmentMode: "distance",
	stageId: null,
	intent: "planned",
	phone: null,
	addressName: null,
	placeUrl: null,
	...overrides,
});

describe("plan POI stage assignment", () => {
	test("distance assignment follows the snapped route distance", () => {
		expect(planPoiBelongsToStage(poi({}), stage1)).toBe(false);
		expect(planPoiBelongsToStage(poi({}), stage2)).toBe(true);
	});

	test("explicit stage assignment wins even when the POI is beyond its boundary", () => {
		const assigned = poi({ assignmentMode: "stage", stageId: "stage-1" });
		expect(planPoiBelongsToStage(assigned, stage1)).toBe(true);
		expect(planPoiBelongsToStage(assigned, stage2)).toBe(false);
	});

	test("plan-only POIs do not appear in a stage", () => {
		expect(planPoiBelongsToStage(poi({ assignmentMode: "plan" }), stage2)).toBe(false);
	});

	test("snapping preserves assignment, intent, and contact metadata", () => {
		const [snapped] = snapPlanPoisToTrack(
			[
				{
					id: "poi-1",
					name: "풍기 모텔",
					poi_type: "accommodation",
					memo: null,
					lat: 37,
					lng: 128,
					assignment_mode: "stage",
					stage_id: "stage-1",
					intent: "candidate",
					phone: "054-000-0000",
					address_name: "풍기읍",
					place_url: "https://place.map.kakao.com/1",
				},
			],
			[{ x: 128, y: 37, d: 101_000, e: 120 }],
		);
		expect(snapped).toMatchObject({
			assignmentMode: "stage",
			stageId: "stage-1",
			intent: "candidate",
			phone: "054-000-0000",
			addressName: "풍기읍",
		});
	});
});
