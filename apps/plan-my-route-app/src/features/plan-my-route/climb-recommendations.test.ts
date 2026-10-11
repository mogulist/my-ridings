import { expect, test } from "bun:test";
import { recommendClimbs } from "./climb-recommendations";
import { makeTerrainPreviewPlan } from "./terrain-preview-data";
const plan = makeTerrainPreviewPlan("normal");
const stage = { id: "s", start_distance: 0, end_distance: 30000 } as any;
test("finds unregistered climbs and filters matching registered summits/CPs", () => {
	const c = recommendClimbs(plan.terrain, stage, plan.track, [], [], []);
	expect(c.length).toBe(2);
	expect(recommendClimbs(plan.terrain, stage, plan.track, plan.summitMarkers, [], []).length).toBe(
		1,
	);
	expect(
		recommendClimbs(
			plan.terrain,
			stage,
			plan.track,
			[],
			[{ distanceKm: c[0].climb.summitKm } as any],
			[],
		).length,
	).toBe(1);
});
test("excluding a recommendation never removes terrain guidance", () => {
	const c = recommendClimbs(plan.terrain, stage, plan.track, [], [], []);
	expect(recommendClimbs(plan.terrain, stage, plan.track, [], [], [], [c[0].climb.id]).length).toBe(
		1,
	);
	expect(plan.terrain.climbs.length).toBe(2);
});
test("respects stage boundaries and existing catalog proximity", () => {
	const c = recommendClimbs(
		plan.terrain,
		{ ...stage, end_distance: 15000 },
		plan.track,
		[],
		[],
		[],
	);
	expect(c.length).toBe(1);
	const catalog = [
		{ id: "s", name: "기존 고개", lat: c[0].point.y, lng: c[0].point.x, elevation_m: 300 },
		{ id: "far", name: "먼 고개", lat: 0, lng: 0, elevation_m: 0 },
	];
	expect(
		recommendClimbs(plan.terrain, stage, plan.track, [], [], catalog)[0].nearby.map((s) => s.id),
	).toEqual(["s"]);
	expect(
		recommendClimbs(makeTerrainPreviewPlan("flat").terrain, stage, plan.track, [], [], []),
	).toEqual([]);
});
