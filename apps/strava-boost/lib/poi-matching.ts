import { snapLatLngToTrack } from "@my-ridings/plan-geometry";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { ActivityStreams, SummitPoi, EventInfo, EventWaypointPoi } from "@/src/types";

// 클라이언트에서 호출 시 same-origin 프록시 사용 (CORS 방지)
// window가 있으면 브라우저 환경 → 상대 경로, 없으면 서버 환경 → 절대 경로 불필요 (직접 호출 X)
const POI_BASE = typeof window !== "undefined" ? "" : "";

const SUMMIT_SNAP_RADIUS_M = 200;
const EVENT_WAYPOINT_SNAP_RADIUS_M = 500;

/** 누적 거리(km) 기준으로 가장 가까운 TrackPoint 반환 */
function trackPointAtDistance(trackPoints: TrackPoint[], distanceKm: number): TrackPoint | null {
  if (trackPoints.length === 0) return null;
  const targetM = distanceKm * 1000;
  let lo = 0, hi = trackPoints.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((trackPoints[mid].d ?? 0) < targetM) lo = mid + 1;
    else hi = mid;
  }
  return trackPoints[lo] ?? null;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function streamsToTrackPoints(streams: ActivityStreams): TrackPoint[] {
  const { latlng, distance } = streams;
  if (!latlng || latlng.length === 0) return [];
  return latlng.map(([lat, lng], i) => ({
    x: lng,
    y: lat,
    d: distance[i] ?? 0,
  }));
}

function trackBbox(trackPoints: TrackPoint[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (trackPoints.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const { x, y } of trackPoints) {
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
    if (x < minLng) minLng = x;
    if (x > maxLng) maxLng = x;
  }
  // 약 2km 여유 마진
  const margin = 0.018;
  return { minLat: minLat - margin, maxLat: maxLat + margin, minLng: minLng - margin, maxLng: maxLng + margin };
}

export async function fetchSummitsForTrack(trackPoints: TrackPoint[]): Promise<SummitPoi[]> {
  if (trackPoints.length === 0) return [];

  const bbox = trackBbox(trackPoints);
  if (!bbox) return [];

  const params = new URLSearchParams({
    minLat: String(bbox.minLat),
    maxLat: String(bbox.maxLat),
    minLng: String(bbox.minLng),
    maxLng: String(bbox.maxLng),
  });

  try {
    const res = await fetch(`${POI_BASE}/api/poi/summits?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const results: SummitPoi[] = [];
    for (const row of data) {
      const snap = snapLatLngToTrack(trackPoints, row.lat, row.lng);
      if (!snap) continue;
      const nearestTp = trackPoints[snap.index];
      const dist = haversineMeters(row.lat, row.lng, nearestTp.y, nearestTp.x);
      if (dist > SUMMIT_SNAP_RADIUS_M) continue;
      results.push({
        id: row.id,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        elevation_m: row.elevation_m ?? null,
        distanceKm: snap.distanceKm,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function findEventForActivity(
  activityName: string,
  activityDate: string,
  trackPoints: TrackPoint[],
): Promise<EventInfo | null> {
  if (!activityName || !activityDate) return null;

  const dateOnly = activityDate.slice(0, 10);
  const params = new URLSearchParams({ name: activityName, date: dateOnly });

  try {
    const res = await fetch(`${POI_BASE}/api/poi/events?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;

    const waypoints: EventWaypointPoi[] = [];
    for (const wp of data.waypoints ?? []) {
      let distanceKm: number;
      let lat: number | null = wp.lat ?? null;
      let lng: number | null = wp.lng ?? null;

      if (wp.distance_from_start_km != null) {
        distanceKm = wp.distance_from_start_km;
        // lat/lng가 없으면 거리로 트랙에서 역산
        if ((lat == null || lng == null) && trackPoints.length > 0) {
          const tp = trackPointAtDistance(trackPoints, distanceKm);
          if (tp) { lat = tp.y; lng = tp.x; }
        }
      } else if (lat != null && lng != null && trackPoints.length > 0) {
        const snap = snapLatLngToTrack(trackPoints, lat, lng);
        if (!snap) continue;
        const nearestTp = trackPoints[snap.index];
        const dist = haversineMeters(lat, lng, nearestTp.y, nearestTp.x);
        if (dist > EVENT_WAYPOINT_SNAP_RADIUS_M) continue;
        distanceKm = snap.distanceKm;
      } else {
        continue;
      }

      waypoints.push({
        id: wp.id,
        name: wp.name,
        waypoint_type: wp.waypoint_type,
        lat,
        lng,
        distanceKm,
        cutoff_seconds_from_start: wp.cutoff_seconds_from_start ?? null,
        supplies_available: wp.supplies_available ?? null,
        memo: wp.memo ?? null,
      });
    }

    return {
      id: data.id,
      name: data.name,
      event_type: data.event_type,
      event_date: data.event_date,
      waypoints,
    };
  } catch {
    return null;
  }
}
