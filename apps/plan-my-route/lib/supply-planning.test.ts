import { describe, expect, test } from "bun:test";
import { CELL_LAT_DEG, CELL_LNG_DEG, cellKeyFor } from "./nearby-grid";
import {
  groupSupplyPlaces,
  type SupplyPlace,
  supplyElevationGainBetween,
  supplyElevationGainCurve,
  supplyGaps,
  supplyKind,
  supplySearchCells,
  supplyStageTrack,
  supplyTrackIndexAtDistance,
} from "./supply-planning";

describe("전체 스테이지 보급 계획", () => {
  test("짧은 스테이지도 경계 좌표와 전체 경로 누적거리를 보존한다", () => {
    expect(
      supplyStageTrack(
        [
          { x: 127, y: 37, d: 0 },
          { x: 128, y: 38, d: 10000 },
        ],
        2,
        3,
      ),
    ).toEqual([
      { x: 127.2, y: 37.2, d: 2000 },
      { x: 127.3, y: 37.3, d: 3000 },
    ]);
  });
  test("보급 구간별 획득고도를 경계 사이에서 계산한다", () => {
    const curve = supplyElevationGainCurve(
      [
        { x: 127, y: 37, d: 0, e: 100 },
        { x: 127.1, y: 37.1, d: 10000, e: 300 },
        { x: 127.2, y: 37.2, d: 20000, e: 200 },
        { x: 127.3, y: 37.3, d: 30000, e: 500 },
      ],
      5,
      25,
    );
    expect(supplyElevationGainBetween(curve, 5000, 25000)).toBe(250);
    expect(supplyElevationGainBetween(curve, 10000, 20000)).toBe(0);
  });
  test("장소 거리와 가장 가까운 고도 프로필 위치를 선택한다", () => {
    const points = [
      { x: 127, y: 37, d: 0 },
      { x: 127.1, y: 37.1, d: 1000 },
      { x: 127.2, y: 37.2, d: 2000 },
    ];
    expect(supplyTrackIndexAtDistance(points, 1400)).toBe(1);
    expect(supplyTrackIndexAtDistance(points, 1700)).toBe(2);
    expect(supplyTrackIndexAtDistance(points, null)).toBeNull();
  });
  test("격자 경계 양쪽을 검색하고 중복 셀은 한 번만 처리한다", () => {
    const point = { x: 2244 * CELL_LNG_DEG, y: 818 * CELL_LAT_DEG, d: 0 };
    const cells = supplySearchCells([point, point], 1000);
    expect(cells.length).toBe(4);
    expect(cells.map((cell) => cell.key)).toContain(cellKeyFor(point.y - 0.001, point.x - 0.001));
    expect(new Set(cells.map((cell) => cell.key)).size).toBe(cells.length);
  });
  test("전체 구간 검색 배치가 8셀을 넘어도 끝까지 포함된다", () => {
    const cells = supplySearchCells(
      Array.from({ length: 20 }, (_, i) => ({ x: 127, y: 36 + i * 0.1, d: i * 11000 })),
      1000,
    );
    expect(cells.length).toBeGreaterThan(8);
    const batches = Array.from({ length: Math.ceil(cells.length / 2) }, (_, i) =>
      cells.slice(i * 2, i * 2 + 2),
    ).flat();
    expect(batches).toEqual(cells);
  });
  test("하나로마트와 하나로클럽은 독립 분류한다", () => {
    expect(supplyKind("풍기농협 하나로마트", "mart")).toBe("hanaro");
    expect(supplyKind("농협하나로클럽", "mart")).toBe("hanaro");
    expect(supplyKind("CU 풍기점", "convenience")).toBe("convenience");
  });
  test("가까운 후보를 묶되 연쇄적으로 먼 지역까지 합치지 않는다", () => {
    const place = (id: string, distance: number | null) =>
      ({ id, route_distance_m: distance }) as SupplyPlace;
    const groups = groupSupplyPlaces([
      place("c", 5000),
      place("b", 2800),
      place("a", 1000),
      place("unknown", null),
    ]);
    expect(groups.map((group) => group.places.map((p) => p.id))).toEqual([["a", "b"], ["c"]]);
  });
  test("스테이지 출발·도착 구간을 포함하고 범위 밖 POI는 제외한다", () => {
    const gaps = supplyGaps(
      [
        { name: "B", km: 170 },
        { name: "A", km: 120 },
        { name: "outside", km: 90 },
      ],
      100,
      200,
    );
    expect(gaps.map((gap) => gap.distanceKm)).toEqual([20, 50, 30]);
    expect(supplyGaps([], 100, 200)[0].distanceKm).toBe(100);
  });
});
