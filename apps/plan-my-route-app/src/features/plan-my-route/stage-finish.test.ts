import { describe, expect, test } from "bun:test";

import type {
  MobilePlanStageRow,
  PlanPoiRow,
  TrackPoint,
} from "@/features/api/plan-my-route";
import { buildStageFinishPlan } from "./stage-finish";

const stages: MobilePlanStageRow[] = [
  {
    id: "stage-1",
    title: null,
    start_distance: 0,
    end_distance: 100_000,
    elevation_gain: 1000,
    elevation_loss: 800,
    memo: null,
    start_name: "출발",
    end_name: "원래 도착",
  },
  {
    id: "stage-2",
    title: null,
    start_distance: 100_000,
    end_distance: 200_000,
    elevation_gain: 1200,
    elevation_loss: 900,
    memo: null,
    start_name: "원래 도착",
    end_name: "다음 도착",
  },
];

const trackPoints: TrackPoint[] = [
  { x: 127, y: 37, d: 0, e: 100 },
  { x: 127.1, y: 37, d: 80_000, e: 300 },
  { x: 127.2, y: 37, d: 100_000, e: 200 },
  { x: 127.3, y: 37, d: 200_000, e: 500 },
];

const poi = (overrides: Partial<PlanPoiRow>): PlanPoiRow => ({
  id: "poi-1",
  plan_id: "plan-1",
  kakao_place_id: null,
  name: "숙소",
  poi_type: "accommodation",
  memo: null,
  lat: 37,
  lng: 127.1,
  assignment_mode: "stage",
  stage_id: "stage-1",
  intent: "candidate",
  phone: null,
  address_name: null,
  place_url: null,
  naver_place_url: null,
  booking_method: "unconfirmed",
  booking_url: null,
  booking_checked_at: null,
  candidate_sort_order: null,
  is_candidate_excluded: false,
  created_at: "2026-09-22T00:00:00Z",
  updated_at: "2026-09-22T00:00:00Z",
  ...overrides,
});

describe("buildStageFinishPlan", () => {
  test("종료 지점과 다음 시작 지점을 맞추고 뒤쪽의 명시적 POI를 이동한다", () => {
    const plan = buildStageFinishPlan(
      stages,
      "stage-1",
      70,
      [
        poi({ id: "before", lng: 127.05 }),
        poi({ id: "after", lng: 127.15 }),
        poi({ id: "distance", lng: 127.15, assignment_mode: "distance", stage_id: null }),
      ],
      trackPoints,
    );

    expect(plan?.currentUpdate.end_distance).toBe(70_000);
    expect(plan?.nextUpdate.start_distance).toBe(70_000);
    expect(plan?.poiIdsToMove).toEqual(["after"]);
  });

  test("마지막 스테이지이거나 새 종료점이 범위 밖이면 종료 계획을 만들지 않는다", () => {
    expect(buildStageFinishPlan(stages, "stage-2", 150, [], trackPoints)).toBeNull();
    expect(buildStageFinishPlan(stages, "stage-1", 100, [], trackPoints)).toBeNull();
  });
});
