import { snapLatLngToTrack } from "@my-ridings/plan-geometry";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import type { ActivityStreams, SummitPoi, EventInfo, EventWaypointPoi } from "@/src/types";

const PMR_URL = process.env.NEXT_PUBLIC_PLAN_MY_ROUTE_URL ?? "";

const SUMMIT_SNAP_RADIUS_M = 200;
const EVENT_WAYPOINT_SNAP_RADIUS_M = 500;

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
  if (!PMR_URL || trackPoints.length === 0) return [];

  const bbox = trackBbox(trackPoints);
  if (!bbox) return [];

  const url = new URL("/api/public/summits", PMR_URL);
  url.searchParams.set("minLat", String(bbox.minLat));
  url.searchParams.set("maxLat", String(bbox.maxLat));
  url.searchParams.set("minLng", String(bbox.minLng));
  url.searchParams.set("maxLng", String(bbox.maxLng));

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
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
  if (!PMR_URL || !activityName || !activityDate) return null;

  const dateOnly = activityDate.slice(0, 10);
  const url = new URL("/api/public/events", PMR_URL);
  url.searchParams.set("name", activityName);
  url.searchParams.set("date", dateOnly);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;

    const waypoints: EventWaypointPoi[] = [];
    for (const wp of data.waypoints ?? []) {
      let distanceKm: number;

      if (wp.distance_from_start_km != null) {
        distanceKm = wp.distance_from_start_km;
      } else if (trackPoints.length > 0) {
        const snap = snapLatLngToTrack(trackPoints, wp.lat, wp.lng);
        if (!snap) continue;
        const nearestTp = trackPoints[snap.index];
        const dist = haversineMeters(wp.lat, wp.lng, nearestTp.y, nearestTp.x);
        if (dist > EVENT_WAYPOINT_SNAP_RADIUS_M) continue;
        distanceKm = snap.distanceKm;
      } else {
        continue;
      }

      waypoints.push({
        id: wp.id,
        name: wp.name,
        waypoint_type: wp.waypoint_type,
        lat: wp.lat,
        lng: wp.lng,
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
