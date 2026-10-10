import { describe, expect, test } from "bun:test";
import { buildRideTerrainBriefing } from "./ride-terrain-data";
import { makeTerrainPreviewPlan } from "./terrain-preview-data";
describe("ride terrain destinations", () => {
	test("supply and climb have separately clipped terrain", () => {
		const b = buildRideTerrainBriefing(makeTerrainPreviewPlan(), 1)!;
		expect(b.supply?.summary.distanceKm).toBe(14);
		expect(b.approach?.summary.distanceKm).toBeGreaterThan(4);
		expect(b.climbName).toBe("솔재");
		expect(b.remainingClimbs).toBe(2);
		expect(b.supply!.summary.gainM).toBeGreaterThan(b.climb!.gainM);
	});
	test("climbing changes approach to remaining summit effort", () => {
		const b = buildRideTerrainBriefing(makeTerrainPreviewPlan(), 8)!;
		expect(b.approach).toBeNull();
		expect(b.summit?.summary.distanceKm).toBeCloseTo(2);
		expect(b.summit?.summary.gainM).toBeGreaterThan(80);
		expect(b.summit?.summary.gainM).toBeLessThan(100);
	});
	test("no supply still exposes remaining climbs", () => {
		const b = buildRideTerrainBriefing(makeTerrainPreviewPlan("no-supply"), 1)!;
		expect(b.supply).toBeNull();
		expect(b.summit).not.toBeNull();
	});
	test("no destinations still exposes the stage finish", () => {
		const b = buildRideTerrainBriefing(makeTerrainPreviewPlan("empty"), 29)!;
		expect(b.supply).toBeNull();
		expect(b.summit).toBeNull();
		expect(b.finish.summary.distanceKm).toBe(1);
	});
	test("preview and unknown elevation are explicit", () => {
		expect(buildRideTerrainBriefing(makeTerrainPreviewPlan(), null)?.preview).toBe(true);
		expect(
			buildRideTerrainBriefing(makeTerrainPreviewPlan("unknown"), 1)?.supply?.summary.gainM,
		).toBeNull();
		expect(buildRideTerrainBriefing(makeTerrainPreviewPlan(), 31)).toBeNull();
	});
});
