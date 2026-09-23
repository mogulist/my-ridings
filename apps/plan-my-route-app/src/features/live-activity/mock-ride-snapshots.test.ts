import { describe, expect, test } from "bun:test";

import { getMockRideSnapshot, getNextMockRidePhase, MOCK_RIDE_PHASES } from "./mock-ride-snapshots";

describe("mock ride Live Activity snapshots", () => {
  test("cycles through ride, supply, and lodging states", () => {
    expect(MOCK_RIDE_PHASES).toEqual(["ride", "supply", "lodging"]);
    expect(getNextMockRidePhase("ride")).toBe("supply");
    expect(getNextMockRidePhase("supply")).toBe("lodging");
    expect(getNextMockRidePhase("lodging")).toBe("ride");
  });

  test("keeps lock-screen progress values valid", () => {
    for (const phase of MOCK_RIDE_PHASES) {
      const snapshot = getMockRideSnapshot(phase);
      expect(snapshot.progress).toBeGreaterThanOrEqual(0);
      expect(snapshot.progress).toBeLessThanOrEqual(1);
      expect(snapshot.primaryName.length).toBeGreaterThan(0);
      expect(snapshot.primaryDistance.length).toBeGreaterThan(0);
    }
  });

  test("shows three upcoming supply stops while riding", () => {
    for (const phase of ["ride", "supply"] as const) {
      const snapshot = getMockRideSnapshot(phase);
      expect(snapshot.nextSupplyName).toBeTruthy();
      expect(snapshot.nextSupplyDistance).toBeTruthy();
      expect(snapshot.nextSupplyAscent).toBeTruthy();
      expect(snapshot.thirdSupplyName).toBeTruthy();
      expect(snapshot.thirdSupplyDistance).toBeTruthy();
      expect(snapshot.thirdSupplyAscent).toBeTruthy();
      expect(snapshot.primaryAscent).toBeTruthy();
    }

    const lodging = getMockRideSnapshot("lodging");
    expect(lodging.nextSupplyName).toBeNull();
    expect(lodging.nextSupplyDistance).toBeNull();
    expect(lodging.nextSupplyAscent).toBeNull();
    expect(lodging.thirdSupplyName).toBeNull();
    expect(lodging.thirdSupplyDistance).toBeNull();
    expect(lodging.thirdSupplyAscent).toBeNull();
  });
});
