import type { TrackPoint } from "@my-ridings/plan-geometry";
import { CELL_LAT_DEG, CELL_LNG_DEG, cellAt, type GridCell } from "./nearby-grid";

export type SupplyKind = "convenience" | "hanaro" | "mart";
export type SupplyPlace = {
  id: string;
  place_name: string;
  address_name: string;
  place_url: string;
  phone: string;
  x: string;
  y: string;
  route_distance_m: number | null;
  detour_m: number;
  kind: SupplyKind;
};

export function supplyKind(name: string, category: string): SupplyKind {
  if (/하나로\s*(마트|클럽)/.test(name)) return "hanaro";
  return category === "convenience" ? "convenience" : "mart";
}

/** 경계점도 보간해 짧은 스테이지와 왕복 경로를 해당 구간 안에서 투영한다. */
export function supplyStageTrack(points: TrackPoint[], startKm: number, endKm: number) {
  const start = startKm * 1000;
  const end = endKm * 1000;
  const result: TrackPoint[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.d == null || b.d == null || b.d <= a.d || b.d < start || a.d > end) continue;
    const aDistance = a.d;
    const bDistance = b.d;
    const at = (d: number): TrackPoint => {
      const f = (d - aDistance) / (bDistance - aDistance);
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        d,
        ...(a.e != null && b.e != null ? { e: a.e + (b.e - a.e) * f } : {}),
      };
    };
    const lo = Math.max(start, a.d);
    const hi = Math.min(end, b.d);
    if (result.at(-1)?.d !== lo) result.push(at(lo));
    if (hi > lo) result.push(at(hi));
  }
  return result;
}

export type SupplyGainPoint = { distanceM: number; gainM: number };

/** 스테이지 안의 누적 상승고도를 한 번 계산해 여러 보급 지점에서 재사용한다. */
export function supplyElevationGainCurve(
  points: TrackPoint[],
  startKm: number,
  endKm: number,
): SupplyGainPoint[] {
  const stagePoints = supplyStageTrack(points, startKm, endKm);
  let gainM = 0;
  return stagePoints.flatMap((point, index) => {
    if (point.d == null || point.e == null) return [];
    const previous = stagePoints[index - 1];
    if (previous?.e != null) gainM += Math.max(0, point.e - previous.e);
    return [{ distanceM: point.d, gainM }];
  });
}

function gainAtDistance(curve: SupplyGainPoint[], distanceM: number): number {
  if (curve.length === 0 || distanceM <= curve[0].distanceM) return curve[0]?.gainM ?? 0;
  const last = curve.at(-1);
  if (!last || distanceM >= last.distanceM) return last?.gainM ?? 0;
  let low = 0;
  let high = curve.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (curve[middle].distanceM <= distanceM) low = middle;
    else high = middle;
  }
  const from = curve[low];
  const to = curve[high];
  const ratio = (distanceM - from.distanceM) / (to.distanceM - from.distanceM);
  return from.gainM + (to.gainM - from.gainM) * ratio;
}

export function supplyElevationGainBetween(
  curve: SupplyGainPoint[],
  fromM: number,
  toM: number,
): number {
  if (toM <= fromM) return 0;
  return Math.round(Math.max(0, gainAtDistance(curve, toM) - gainAtDistance(curve, fromM)));
}

/** 장소의 전체 경로 누적거리와 가장 가까운 원본 트랙 인덱스를 찾는다. */
export function supplyTrackIndexAtDistance(
  points: TrackPoint[],
  distanceM: number | null,
): number | null {
  if (distanceM == null) return null;
  let closestIndex: number | null = null;
  let closestDifference = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index++) {
    const pointDistance = points[index].d;
    if (pointDistance == null) continue;
    const difference = Math.abs(pointDistance - distanceM);
    if (difference < closestDifference) {
      closestDifference = difference;
      closestIndex = index;
    }
    if (pointDistance > distanceM && difference > closestDifference) break;
  }
  return closestIndex;
}

/** 경로 양옆의 셀도 포함해 격자 경계 밖의 가게를 놓치지 않는다. */
export function supplySearchCells(points: TrackPoint[], detourM: number): GridCell[] {
  const cells = new Map<string, GridCell>();
  for (const point of points) {
    const latPad = detourM / 110574;
    const lngPad = detourM / (111320 * Math.cos((point.y * Math.PI) / 180));
    for (
      let lat = Math.floor((point.y - latPad) / CELL_LAT_DEG);
      lat <= Math.floor((point.y + latPad) / CELL_LAT_DEG);
      lat++
    ) {
      for (
        let lng = Math.floor((point.x - lngPad) / CELL_LNG_DEG);
        lng <= Math.floor((point.x + lngPad) / CELL_LNG_DEG);
        lng++
      ) {
        const cell = cellAt(lat, lng);
        cells.set(cell.key, cell);
      }
    }
  }
  return [...cells.values()];
}

export function groupSupplyPlaces(places: SupplyPlace[]) {
  const sorted = places
    .filter((p) => p.route_distance_m != null)
    .sort((a, b) => (a.route_distance_m ?? 0) - (b.route_distance_m ?? 0));
  const groups: { startM: number; endM: number; places: SupplyPlace[] }[] = [];
  for (const place of sorted) {
    const last = groups.at(-1);
    const distance = place.route_distance_m;
    if (distance == null) continue;
    if (last && distance - last.startM <= 2000) {
      last.endM = distance;
      last.places.push(place);
    } else groups.push({ startM: distance, endM: distance, places: [place] });
  }
  return groups;
}

export function supplyGaps(stops: { name: string; km: number }[], startKm: number, endKm: number) {
  const ordered = [
    { name: "출발", km: startKm },
    ...stops.filter((s) => s.km >= startKm && s.km <= endKm).sort((a, b) => a.km - b.km),
    { name: "도착", km: endKm },
  ];
  return ordered
    .slice(1)
    .map((stop, i) => ({ from: ordered[i], to: stop, distanceKm: stop.km - ordered[i].km }));
}
