import { describe, expect, test } from "bun:test";

import type { PlanDetail, PlanPoiRow } from "@/features/api/plan-my-route";

import { buildRideSupplySnapshot, locateRide, prepareRideSupplyPlan } from "./ride-supply-data";

const now = 1_800_000_000_000;
const track = Array.from({ length: 101 }, (_, index) => ({
  x: 127 + index / 1000,
  y: 37,
  d: index * 100,
  e: index * 5,
}));
function poi(id: string, index: number, overrides: Partial<PlanPoiRow> = {}): PlanPoiRow {
  return {
    id,
    name: id,
    plan_id: "plan",
    poi_type: "convenience",
    lat: 37,
    lng: track[index].x,
    assignment_mode: "distance",
    stage_id: null,
    intent: "candidate",
    is_candidate_excluded: false,
    kakao_place_id: null,
    memo: null,
    phone: null,
    address_name: null,
    place_url: null,
    naver_place_url: null,
    booking_method: "unconfirmed",
    booking_url: null,
    booking_checked_at: null,
    candidate_sort_order: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
function detail(pois: PlanPoiRow[]): PlanDetail {
  return {
    plan: {
      id: "plan",
      name: "라이딩",
      start_date: null,
      review_note: null,
      public_share_token: "",
      shared_at: null,
    },
    route: {
      name: "경로",
      rwgps_url: "",
      total_distance: 10000,
      elevation_gain: 500,
      elevation_loss: 0,
      cover_image_hero_url: null,
      cover_image_og_url: null,
    },
    trackPoints: track,
    planPois: pois,
    knownRouteElevationGainM: 500,
    stages: [0, 1].map((index) => ({
      id: `stage-${index + 1}`,
      title: null,
      start_distance: index * 5000,
      end_distance: (index + 1) * 5000,
      elevation_gain: 250,
      elevation_loss: 0,
      memo: null,
      start_name: null,
      end_name: null,
    })),
    summitMarkers: [],
    cpMarkers: [],
    officialSummits: [],
  };
}
const position = { km: 1, timestamp: now };

describe("실제 라이딩 보급정보", () => {
  test("앞에 있는 미방문 편의점·마트 3곳만 거리순으로 표시한다", () => {
    const plan = prepareRideSupplyPlan(
      detail([
        poi("뒤", 5),
        poi("세번째", 40),
        poi("첫번째", 20, { intent: "planned" }),
        poi("방문함", 15, { intent: "confirmed" }),
        poi("숙소", 12, { poi_type: "accommodation" }),
        poi("제외", 13, { is_candidate_excluded: true }),
        poi("네번째", 45),
        poi("두번째", 30, { poi_type: "mart" }),
      ]),
    );
    const snapshot = buildRideSupplySnapshot(plan, position);
    expect(snapshot.primaryName).toBe("첫번째");
    expect(snapshot.primaryDistance).toBe("1.0 km");
    expect(snapshot.nextSupplyName).toBe("두번째");
    expect(snapshot.thirdSupplyName).toBe("세번째");
    expect(snapshot.primaryAscent).toBe("+30 m");
    expect(snapshot.nextSupplyAscent).toBe("+80 m");
  });
  test("통과하면 다음 보급소로 넘어가며 명시적 스테이지 배정을 유지한다", () => {
    const plan = prepareRideSupplyPlan(
      detail([
        poi("첫번째", 20),
        poi("다음", 30),
        poi("1일차 끝 밖", 60, { assignment_mode: "stage", stage_id: "stage-1" }),
        poi("2일차", 70),
        poi("플랜 보관", 40, { assignment_mode: "plan" }),
      ]),
    );
    expect(buildRideSupplySnapshot(plan, { km: 2.1, timestamp: now }).primaryName).toBe("다음");
    expect(buildRideSupplySnapshot(plan, { km: 4.8, timestamp: now }).primaryName).toBe(
      "1일차 끝 밖",
    );
    expect(buildRideSupplySnapshot(plan, { km: 5, timestamp: now }).primaryName).toBe("2일차");
  });
  test("위치 대기·경로 밖·보급소 없음에 가짜 거리를 표시하지 않는다", () => {
    const plan = prepareRideSupplyPlan(detail([]));
    expect(buildRideSupplySnapshot(plan, null).primaryName).toBe("GPS 위치 확인 중");
    expect(buildRideSupplySnapshot(plan, position).primaryName).toBe("남은 보급소 없음");
    const offRoute = buildRideSupplySnapshot(plan, position, "경로 밖 · 복귀 후 갱신");
    expect(offRoute.primaryDistance).toBe("—");
    expect(offRoute.nextSupplyName).toBeNull();
  });
  test("고도 없는 경로에서도 보급소를 숨기거나 획득고도 0으로 꾸미지 않는다", () => {
    const input = detail([poi("보급", 30)]);
    input.trackPoints = track.map(({ e: _e, ...point }) => point);
    const snapshot = buildRideSupplySnapshot(prepareRideSupplyPlan(input), position);
    expect(snapshot.primaryName).toBe("보급");
    expect(snapshot.primaryAscent).toBe("고도 정보 없음");
  });
});

describe("라이딩 위치 신뢰도", () => {
  const fix = { latitude: 37, longitude: 127.015, accuracy: 10, timestamp: now };
  test("희소한 트랙의 선분 중간 위치를 보간한다", () => {
    const result = locateRide([track[0], track[100]], fix, null, now);
    expect(result.position?.km).toBeCloseTo(1.5, 5);
  });
  test("경로에서 멀리 떨어진 위치를 0km로 표시하지 않는다", () => {
    expect(locateRide(track, { ...fix, latitude: 38 }, null, now).position).toBeNull();
  });
  test("오래되거나 부정확한 GPS는 거절한다", () => {
    expect(locateRide(track, { ...fix, accuracy: 500 }, null, now).position).toBeNull();
    expect(locateRide(track, { ...fix, timestamp: now - 180000 }, null, now).position).toBeNull();
  });
  test("짧은 시간에 멀리 있는 왕복 구간으로 점프하지 않는다", () => {
    const result = locateRide(
      track,
      { ...fix, longitude: track[90].x },
      { km: 1, timestamp: now - 1000 },
      now,
    );
    expect(result.position).toBeNull();
  });
});
