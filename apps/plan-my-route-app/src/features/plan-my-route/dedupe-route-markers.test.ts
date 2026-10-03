import { describe, expect, test } from "bun:test";

import type {
  CpMarkerOnRoute,
  SummitMarkerOnRoute,
} from "@/features/api/plan-my-route";
import { removeSummitsDuplicatedByCheckpoints } from "./dedupe-route-markers";

const checkpoint = (overrides: Partial<CpMarkerOnRoute> = {}): CpMarkerOnRoute => ({
  id: 1,
  name: "CP - 베틀재",
  distanceKm: 58,
  elevation: 635,
  trackPointIndex: 100,
  ...overrides,
});

const summit = (overrides: Partial<SummitMarkerOnRoute> = {}): SummitMarkerOnRoute => ({
  id: "summit-1",
  passIndex: 0,
  name: "베틀재",
  distanceKm: 58.2,
  elevation: 661,
  trackPointIndex: 104,
  ...overrides,
});

describe("removeSummitsDuplicatedByCheckpoints", () => {
  test("같은 이름의 CP가 500m 안에 있으면 서밋을 숨긴다", () => {
    expect(removeSummitsDuplicatedByCheckpoints([summit()], [checkpoint()])).toEqual([]);
  });

  test("CP 접두사와 구분 기호 차이를 무시한다", () => {
    const result = removeSummitsDuplicatedByCheckpoints(
      [summit({ name: "여우목 고개" })],
      [checkpoint({ name: "CP_여우목-고개", distanceKm: 58.5 })],
    );

    expect(result).toEqual([]);
  });

  test("같은 이름이어도 500m보다 멀면 둘 다 유지한다", () => {
    const marker = summit({ distanceKm: 58.501 });
    expect(removeSummitsDuplicatedByCheckpoints([marker], [checkpoint()])).toEqual([marker]);
  });

  test("이름이 다른 가까운 지점은 유지한다", () => {
    const marker = summit({ name: "만항재", distanceKm: 58.1 });
    expect(removeSummitsDuplicatedByCheckpoints([marker], [checkpoint()])).toEqual([marker]);
  });
});
