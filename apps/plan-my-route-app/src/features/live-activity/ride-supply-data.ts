import {
  calibrateThreshold,
  computeTrackElevationGainLoss,
  planPoiBelongsToStage,
  snapPlanPoisToTrack,
  type SnappedPlanPoi,
} from "@my-ridings/plan-geometry";

import type { PlanDetail, TrackPoint } from "@/features/api/plan-my-route";

import type { RideLiveActivityProps } from "./mock-ride-snapshots";

export type RideFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export type RidePosition = {
  km: number;
  timestamp: number;
};

export type RideSupplyPlan = {
  track: TrackPoint[];
  threshold: number;
  stages: { id: string; startDistanceKm: number; endDistanceKm: number }[];
  stops: SnappedPlanPoi[];
};

export function prepareRideSupplyPlan(detail: PlanDetail): RideSupplyPlan {
  const track = detail.trackPoints.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.d),
  );
  const supplies = detail.planPois.filter(
    (poi) =>
      (poi.poi_type === "convenience" || poi.poi_type === "mart") &&
      poi.intent !== "confirmed" &&
      !poi.is_candidate_excluded,
  );
  return {
    track,
    threshold: calibrateThreshold(track, detail.knownRouteElevationGainM),
    stages: detail.stages.map((stage) => ({
      id: stage.id,
      startDistanceKm: (stage.start_distance ?? 0) / 1000,
      endDistanceKm: (stage.end_distance ?? stage.start_distance ?? 0) / 1000,
    })),
    // A missing altitude must not hide a supply stop. The original track remains unchanged.
    stops: snapPlanPoisToTrack(
      supplies,
      track.map((point) => ({ ...point, e: point.e ?? 0 })),
    ),
  };
}

/** Project onto segments, so sparse tracks don't turn a rider between samples into an off-route fix. */
export function locateRide(
  track: TrackPoint[],
  fix: RideFix,
  previous: RidePosition | null,
  now = Date.now(),
): { position: RidePosition | null; reason: string | null } {
  if (
    !Number.isFinite(fix.latitude) ||
    !Number.isFinite(fix.longitude) ||
    Math.abs(fix.latitude) > 90 ||
    Math.abs(fix.longitude) > 180 ||
    !Number.isFinite(fix.timestamp) ||
    now - fix.timestamp > 120_000 ||
    fix.timestamp > now + 10_000 ||
    (fix.accuracy != null &&
      (!Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 100))
  ) {
    return { position: null, reason: "GPS 위치 확인 중" };
  }
  const scaleX = 111320 * Math.cos((fix.latitude * Math.PI) / 180);
  const elapsed = previous ? Math.max(0, (fix.timestamp - previous.timestamp) / 1000) : Infinity;
  // Keep nearby parallel/return sections from jumping many kilometres on a single GPS update.
  const maxTravelKm = Math.max(1, elapsed * 0.03);
  let nearest: { km: number; distance: number } | null = null;
  for (let index = 1; index < track.length; index++) {
    const a = track[index - 1];
    const b = track[index];
    if (a.d == null || b.d == null || b.d < a.d) continue;
    const ax = (a.x - fix.longitude) * scaleX;
    const ay = (a.y - fix.latitude) * 110574;
    const dx = (b.x - a.x) * scaleX;
    const dy = (b.y - a.y) * 110574;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
    const km = (a.d + (b.d - a.d) * t) / 1000;
    if (previous && Math.abs(km - previous.km) > maxTravelKm) continue;
    const distance = Math.hypot(ax + dx * t, ay + dy * t);
    if (!nearest || distance < nearest.distance) nearest = { km, distance };
  }
  if (!nearest || nearest.distance > 300) {
    return { position: null, reason: "경로 밖 · 복귀 후 갱신" };
  }
  return { position: { km: nearest.km, timestamp: fix.timestamp }, reason: null };
}

export function buildRideSupplySnapshot(
  plan: RideSupplyPlan | null,
  position: RidePosition | null,
  message: string | null = null,
): RideLiveActivityProps {
  const km = position?.km ?? null;
  const stageIndex =
    plan && km != null
      ? plan.stages.findIndex(
          (stage, index) =>
            km >= stage.startDistanceKm &&
            (km < stage.endDistanceKm ||
              (index === plan.stages.length - 1 && km <= stage.endDistanceKm + 0.05)),
        )
      : -1;
  const stage = plan?.stages[stageIndex];
  const stops =
    plan && km != null && stage && !message
      ? plan.stops
          .filter((stop) => stop.distanceKm >= km - 0.05 && planPoiBelongsToStage(stop, stage))
          .slice(0, 3)
      : [];
  const distance = (index: number) =>
    stops[index] && km != null
      ? `${Math.max(0, stops[index].distanceKm - km).toFixed(1)} km`
      : null;
  const ascent = (index: number) => {
    const stop = stops[index];
    if (!plan || !stop || km == null) return null;
    const points = plan.track.filter(
      (point) => point.d! >= km * 1000 && point.d! <= stop.distanceKm * 1000,
    );
    if (points.some((point) => !Number.isFinite(point.e)) || points.length < 2) {
      return stop.distanceKm - km <= 0.05 ? "+0 m" : "고도 정보 없음";
    }
    return `+${computeTrackElevationGainLoss(plan.track, km, stop.distanceKm, plan.threshold).gain.toLocaleString()} m`;
  };
  const updated = position
    ? new Date(position.timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;
  const status =
    message ??
    (!plan
      ? "경로 불러오는 중"
      : km == null
        ? "GPS 위치 확인 중"
        : !stage
          ? "스테이지 경로 밖"
          : "남은 보급소 없음");
  return {
    phase: "ride",
    phaseLabel: "라이딩",
    stageLabel: stage ? `스테이지 ${stageIndex + 1}` : "라이딩",
    progress: 0,
    progressLabel: "",
    remainingLabel: distance(0) ?? "보급",
    primaryLabel: stops.length ? `다음 보급 · ${updated} 갱신` : "실시간 현황",
    primaryName: stops[0]?.name ?? status,
    primaryDistance: distance(0) ?? "—",
    primaryAscent: ascent(0) ?? "",
    nextSupplyName: stops[1]?.name ?? null,
    nextSupplyDistance: distance(1),
    nextSupplyAscent: ascent(1),
    thirdSupplyName: stops[2]?.name ?? null,
    thirdSupplyDistance: distance(2),
    thirdSupplyAscent: ascent(2),
    secondaryLabel: updated ? `${updated} 위치 기준` : "위치 수신 대기",
    secondaryValue: "경로 기준 거리·획득고도",
    accentColor: stops.length ? "#FF9500" : "#8E8E93",
  };
}
