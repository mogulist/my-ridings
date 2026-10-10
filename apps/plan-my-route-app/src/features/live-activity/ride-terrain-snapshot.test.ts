import { expect, test } from "bun:test";
import { buildRideSupplySnapshot } from "./ride-supply-data";
import { makeTerrainPreviewPlan } from "@/features/plan-my-route/terrain-preview-data";
const position = { km: 1, timestamp: Date.now() };
test("lock screen keeps supply and upcoming climb together", () => {
	const s = buildRideSupplySnapshot(makeTerrainPreviewPlan(), position);
	expect(s.primaryName).toBe("CU 강변점");
	expect(s.primaryTerrain).toContain("평지 3.0km");
	expect(s.climbLabel).toContain("솔재");
	expect(s.climbDistance).toContain("시작");
	expect(s.secondaryValue).toContain("보급 전");
});
test("without supply, climbing and stage finish still have useful information", () => {
	const s = buildRideSupplySnapshot(makeTerrainPreviewPlan("no-supply"), position);
	expect(s.primaryName).toBe("솔재");
	expect(s.primaryLabel).toBe("다음 오르막 시작");
	expect(s.climbStats).toContain("오르막 자체");
	expect(s.secondaryValue).toBe("남은 오르막 2개");
	const empty = buildRideSupplySnapshot(makeTerrainPreviewPlan("empty"), position);
	expect(empty.primaryName).toBe("스테이지 종료점까지");
	expect(empty.primaryDistance).toBe("29.0 km");
	expect(empty.primaryTerrain).toContain("평지");
});
test("a climb in progress exposes remaining summit effort", () => {
	const s = buildRideSupplySnapshot(makeTerrainPreviewPlan("no-supply"), { ...position, km: 8 });
	expect(s.primaryLabel).toBe("오르막 진행 중");
	expect(s.primaryDistance).toBe("2.0 km");
});
test("old saved plans are upgraded without losing supplies", () => {
	const p = makeTerrainPreviewPlan();
	const legacy = { ...p, terrain: undefined, summitMarkers: undefined };
	expect(buildRideSupplySnapshot(legacy, position).primaryName).toBe("CU 강변점");
	expect(legacy.terrain).toBeDefined();
	expect(buildRideSupplySnapshot(p, position, "경로 밖").primaryDistance).toBe("—");
});
