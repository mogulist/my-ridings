"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ElevationProfile,
  type CPOnRoute,
  type SummitOnRoute,
  type TrackPoint,
} from "./ElevationProfile";
import KakaoMap, {
  type RideWithGPSRoute,
  type PointOfInterest,
} from "./KakaoMap";
import { usePlanStages } from "../hooks/usePlanStages";
import { useGuestRouteStore } from "../hooks/useGuestRouteStore";
import { PlanListPane } from "./PlanListPane";
import { PlanStagesPane, stageDayLabel } from "./PlanStagesPane";
import { StageDetailPanel } from "./StageDetailPanel";
import { StageEditDialog } from "./StageEditDialog";
import { PoiEditDialog } from "./PoiEditDialog";
import type { SnappedPlanPoi } from "@my-ridings/plan-geometry";
import {
  PendingDeletionDialog,
  DeleteConfirmationDialog,
} from "./DeleteStageDialog";
import { motion } from "motion/react";
import { cn } from "@my-ridings/ui";
import type { Stage } from "../types/plan";
import type { PlanPoiRow } from "../types/planPoi";
import type { GuestPlan } from "../types/guestPlan";
import {
  normalizeScheduleMarkerMemos,
  upsertScheduleMarkerMemo,
} from "../types/scheduleMarkerMemos";
import type { SummitCatalogRow } from "../types/summitCatalog";

type RouteViewerProps = {
  routeId: string;
  mode?: "db" | "guest";
};

type DbStage = {
  id: string;
  start_distance: number;
  end_distance: number;
  elevation_gain: number | string | null;
  elevation_loss: number | string | null;
  memo?: string | null;
  start_name?: string | null;
  end_name?: string | null;
};

type DbPlanSnapshot = {
  id: string;
  stages?: DbStage[];
};

type DbRouteSnapshot = {
  plans?: DbPlanSnapshot[];
};

function normalizeDbStages(rawStages: DbStage[]): Stage[] {
  const sortedStages = [...rawStages].sort(
    (a, b) => a.start_distance - b.start_distance,
  );
  return sortedStages.map((s, index) => ({
    id: s.id,
    dayNumber: index + 1,
    startDistanceKm: s.start_distance / 1000,
    endDistanceKm: s.end_distance / 1000,
    distanceKm: (s.end_distance - s.start_distance) / 1000,
    elevationGain: Number(s.elevation_gain) || 0,
    elevationLoss: Number(s.elevation_loss) || 0,
    isLastStage: false,
    memo: s.memo ?? undefined,
    startName: s.start_name?.trim() ? s.start_name : undefined,
    endName: s.end_name?.trim() ? s.end_name : undefined,
  }));
}

function serializeStagesForPlanCache(stages: Stage[]): DbStage[] {
  return stages.map((stage) => ({
    id: stage.id,
    start_distance: Math.round(stage.startDistanceKm * 1000),
    end_distance: Math.round(stage.endDistanceKm * 1000),
    elevation_gain: stage.elevationGain,
    elevation_loss: stage.elevationLoss,
    memo: stage.memo ?? null,
    start_name: stage.startName?.trim() ? stage.startName : null,
    end_name: stage.endName?.trim() ? stage.endName : null,
  }));
}

function isSamePlanStages(a: DbStage[] | undefined, b: DbStage[]): boolean {
  if ((a?.length ?? 0) !== b.length) return false;
  if (!a) return b.length === 0;
  return a.every((stage, index) => {
    const next = b[index];
    return (
      stage.id === next.id &&
      stage.start_distance === next.start_distance &&
      stage.end_distance === next.end_distance &&
      Number(stage.elevation_gain ?? 0) === Number(next.elevation_gain ?? 0) &&
      Number(stage.elevation_loss ?? 0) === Number(next.elevation_loss ?? 0) &&
      (stage.memo ?? null) === (next.memo ?? null) &&
      (stage.start_name ?? null) === (next.start_name ?? null) &&
      (stage.end_name ?? null) === (next.end_name ?? null)
    );
  });
}

export function computeCPsOnRoute(
  pois: PointOfInterest[],
  trackPoints: TrackPoint[],
): CPOnRoute[] {
  const controls = pois.filter(
    (p) => p.poi_type_name?.toLowerCase() === "control",
  );
  if (controls.length === 0 || trackPoints.length === 0) return [];

  return controls
    .map((poi) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < trackPoints.length; i++) {
        const tp = trackPoints[i];
        const d2 = (tp.y - poi.lat) ** 2 + (tp.x - poi.lng) ** 2;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = i;
        }
      }
      const tp = trackPoints[bestIdx];
      return {
        id: poi.id,
        name: poi.name,
        distanceKm: (tp.d ?? 0) / 1000,
        elevation: tp.e ?? 0,
        trackPointIndex: bestIdx,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function computeSummitsOnRoute(
  summits: SummitCatalogRow[],
  trackPoints: TrackPoint[],
): SummitOnRoute[] {
  if (summits.length === 0 || trackPoints.length === 0) return [];
  return summits
    .map((summit) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < trackPoints.length; i++) {
        const tp = trackPoints[i];
        const d2 = (tp.y - summit.lat) ** 2 + (tp.x - summit.lng) ** 2;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = i;
        }
      }
      const tp = trackPoints[bestIdx];
      return {
        id: summit.id,
        name: summit.name,
        distanceKm: (tp.d ?? 0) / 1000,
        elevation: summit.elevation_m ?? tp.e ?? 0,
        trackPointIndex: bestIdx,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function summitQueryStringForTrackPoints(trackPoints: TrackPoint[]): string | null {
  if (trackPoints.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of trackPoints) {
    if (point.y < minLat) minLat = point.y;
    if (point.y > maxLat) maxLat = point.y;
    if (point.x < minLng) minLng = point.x;
    if (point.x > maxLng) maxLng = point.x;
  }
  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }
  const buffer = 0.01;
  const search = new URLSearchParams({
    minLat: String(minLat - buffer),
    maxLat: String(maxLat + buffer),
    minLng: String(minLng - buffer),
    maxLng: String(maxLng + buffer),
    limit: "1200",
  });
  return search.toString();
}

export default function RouteViewer({ routeId, mode = "db" }: RouteViewerProps) {
  const isGuestMode = mode === "guest";
  const { getRouteById, upsertRoute } = useGuestRouteStore();
  const [isGuestRouteLoaded, setIsGuestRouteLoaded] = useState(!isGuestMode);
  const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
  const [dbRoute, setDbRoute] = useState<any>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [dbStages, setDbStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState("");
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [positionIndex, setPositionIndex] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  );
  const [planListCollapsed, setPlanListCollapsed] = useState(false);
  const [panelStageId, setPanelStageId] = useState<string | null>(null);
  const [focusPlanPoiRequest, setFocusPlanPoiRequest] = useState<{
    poiId: string;
    nonce: number;
  } | null>(null);
  const [mapCenterOnRouteKmRequest, setMapCenterOnRouteKmRequest] = useState<{
    distanceKm: number;
    nonce: number;
  } | null>(null);
  const [stageEndBoundaryChartEditMode, setStageEndBoundaryChartEditMode] = useState(false);
  const [stageEditOpen, setStageEditOpen] = useState(false);
  const [poiEditSnap, setPoiEditSnap] = useState<SnappedPlanPoi | null>(null);
  const [isReorderingPlans, setIsReorderingPlans] = useState(false);
  const [planActionInProgress, setPlanActionInProgress] = useState<
    null | "create" | "update" | "duplicate" | "delete" | "share"
  >(null);
  const [isStagesPending, startStagesTransition] = useTransition();
  const [planPois, setPlanPois] = useState<PlanPoiRow[]>([]);
  const [officialSummits, setOfficialSummits] = useState<SummitCatalogRow[]>([]);
  /** guest: loadFromGuest가 planPois를 반영하기 전 빈 배열로 persist하면 LS의 POI가 지워지므로, 하이드 완료 후에만 POI persist 허용 */
  const [guestPlanPoiPersistReady, setGuestPlanPoiPersistReady] = useState(false);

  const mapPlanToGuestPlan = useCallback((plan: any, index: number): GuestPlan => {
    const nowIso = new Date().toISOString();
    const guestStages = ((plan?.stages ?? []) as DbStage[]).map((stage) => ({
      id: stage.id,
      title: null,
      start_distance: stage.start_distance,
      end_distance: stage.end_distance,
      elevation_gain: Number(stage.elevation_gain) || 0,
      elevation_loss: Number(stage.elevation_loss) || 0,
      memo: stage.memo ?? null,
      start_name: stage.start_name ?? null,
      end_name: stage.end_name ?? null,
    }));
    const scheduleMarkerMemos = normalizeScheduleMarkerMemos(
      plan.schedule_marker_memos,
    );
    return {
      id: plan.id,
      name: plan.name ?? "플랜",
      start_date: plan.start_date ?? null,
      public_share_token: plan.public_share_token ?? null,
      shared_at: plan.shared_at ?? null,
      sort_order: Number.isFinite(plan.sort_order) ? plan.sort_order : index,
      created_at: plan.created_at ?? nowIso,
      updated_at: nowIso,
      stages: guestStages,
      ...(scheduleMarkerMemos != null
        ? { schedule_marker_memos: scheduleMarkerMemos }
        : {}),
    };
  }, []);

  const persistGuestRoute = useCallback(
    (options?: { nextDbRoute?: any; targetPlanId?: string; nextPlanPois?: PlanPoiRow[] }) => {
      if (!isGuestMode) return;
      const baseRoute = getRouteById(routeId);
      const sourceRoute = options?.nextDbRoute ?? dbRoute;
      if (!baseRoute || !sourceRoute) return;

      const nextPlans = (sourceRoute.plans ?? []).map((plan: any, index: number) =>
        mapPlanToGuestPlan(plan, index),
      );
      const nextPlanPoisByPlanId = { ...(baseRoute.plan_pois_by_plan_id ?? {}) };
      const targetPlanId = options?.targetPlanId ?? activePlanId;
      if (targetPlanId && options?.nextPlanPois) {
        nextPlanPoisByPlanId[targetPlanId] = options.nextPlanPois;
      }
      for (const plan of nextPlans) {
        if (!nextPlanPoisByPlanId[plan.id]) nextPlanPoisByPlanId[plan.id] = [];
      }

      upsertRoute({
        ...baseRoute,
        name: sourceRoute.name ?? baseRoute.name,
        rwgps_url: sourceRoute.rwgps_url ?? baseRoute.rwgps_url,
        total_distance:
          sourceRoute.total_distance ?? sourceRoute.distance ?? baseRoute.total_distance,
        elevation_gain: sourceRoute.elevation_gain ?? baseRoute.elevation_gain,
        elevation_loss: sourceRoute.elevation_loss ?? baseRoute.elevation_loss,
        start_date: sourceRoute.start_date ?? baseRoute.start_date,
        plans: nextPlans,
        plan_pois_by_plan_id: nextPlanPoisByPlanId,
        updated_at: new Date().toISOString(),
      });
    },
    [isGuestMode, getRouteById, routeId, dbRoute, mapPlanToGuestPlan, activePlanId, upsertRoute],
  );

  const handlePin = useCallback((index: number) => {
    setPositionIndex(index);
    setIsPinned(true);
  }, []);

  const handleUnpin = useCallback(() => {
    setIsPinned(false);
  }, []);

  const handleMapCenterOnRouteKmConsumed = useCallback(() => {
    setMapCenterOnRouteKmRequest(null);
  }, []);

  const cpMarkers = useMemo(
    () =>
      route
        ? computeCPsOnRoute(route.points_of_interest, route.track_points)
        : [],
    [route],
  );
  const summitMarkers = useMemo(
    () =>
      route
        ? computeSummitsOnRoute(officialSummits, route.track_points)
        : [],
    [route, officialSummits],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (isGuestMode) setGuestPlanPoiPersistReady(false);

    const loadFromDb = () =>
      fetch(`/api/routes/${routeId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load route from DB");
          return res.json();
        })
        .then((dbData) => {
          if (cancelled) return null;
          setDbRoute(dbData);

          if (dbData.plans && dbData.plans.length > 0) {
            const firstPlan = dbData.plans[0];
            setActivePlanId(firstPlan.id);
            setDbStages(normalizeDbStages(firstPlan.stages || []));
          }

          const match = dbData.rwgps_url.match(/\/routes\/(\d+)/);
          const rwgpsId = match ? match[1] : null;
          if (!rwgpsId) throw new Error("Invalid RWGPS URL in database");
          return fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
        });

    const loadFromGuest = async () => {
      const guestRoute = getRouteById(routeId);
      if (!guestRoute) throw new Error("로컬에 저장된 guest 플랜을 찾을 수 없습니다.");
      if (cancelled) return null;
      setDbRoute({
        id: guestRoute.id,
        name: guestRoute.name,
        rwgps_url: guestRoute.rwgps_url,
        total_distance: guestRoute.total_distance,
        elevation_gain: guestRoute.elevation_gain,
        elevation_loss: guestRoute.elevation_loss,
        start_date: guestRoute.start_date,
        plans: guestRoute.plans,
      });
      const firstPlan = guestRoute.plans[0];
      if (firstPlan) {
        const initialPois = guestRoute.plan_pois_by_plan_id[firstPlan.id] ?? [];
        setActivePlanId(firstPlan.id);
        setDbStages(normalizeDbStages(firstPlan.stages as DbStage[]));
        setPlanPois(initialPois);
      } else {
        setActivePlanId(null);
        setDbStages([]);
        setPlanPois([]);
      }
      if (cancelled) return null;
      setGuestPlanPoiPersistReady(true);
      setIsGuestRouteLoaded(true);
      const match = guestRoute.rwgps_url.match(/\/routes\/(\d+)/);
      const rwgpsId = match ? match[1] : null;
      if (!rwgpsId) throw new Error("Invalid RWGPS URL in guest route");
      return fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
    };

    (isGuestMode ? loadFromGuest() : loadFromDb())
      .then((res) => {
        if (!res) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RideWithGPSRoute>;
      })
      .then((data) => {
        if (!cancelled && data) setRoute(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, isGuestMode, getRouteById]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setIsCreatingPlan(true);
    setPlanActionInProgress("create");
    try {
      if (isGuestMode) {
        const nowIso = new Date().toISOString();
        const newPlan = {
          id: crypto.randomUUID(),
          name: newPlanName,
          start_date: null,
          sort_order: (dbRoute?.plans?.length ?? 0) + 1,
          created_at: nowIso,
          updated_at: nowIso,
          stages: [],
        };
        setDbRoute((prev: any) => ({
          ...prev,
          plans: [...(prev?.plans || []), newPlan],
        }));
        setActivePlanId(newPlan.id);
        setDbStages([]);
        setPlanPois([]);
        setNewPlanName("");
        return;
      }
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_id: routeId, name: newPlanName }),
      });
      if (!res.ok) throw new Error("Plan creation failed");
      const newPlan = await res.json();

      setDbRoute((prev: any) => ({
        ...prev,
        plans: [...(prev?.plans || []), { ...newPlan, stages: [] }],
      }));
      setActivePlanId(newPlan.id);
      setDbStages([]);
      setNewPlanName("");
    } catch (error) {
      console.error(error);
      alert("플랜 생성에 실패했습니다.");
    } finally {
      setIsCreatingPlan(false);
      setPlanActionInProgress(null);
    }
  };

  const {
    stages,
    activeStageId,
    setActiveStageId,
    totalRouteDistanceKm,
    unplannedDistanceKm,
    calibratedThreshold,

    addStage,
    addLastStage,
    updateStageDistance,

    pendingStageEdit,
    previewStageStats,
    startBoundaryPreview,
    updatePreviewEndKm,
    commitPreview,
    discardPreview,

    pendingDeletion,
    confirmNextStageDeletion,
    cancelPendingDeletion,

    deleteConfirmation,
    requestDeleteStage,
    executeDeleteStage,
    cancelDeleteConfirmation,

    updateStageMeta,
  } = usePlanStages(
    route?.track_points ?? [],
    route?.elevation_gain ?? 0,
    dbStages, // Pass initial stages loaded from DB
    isGuestMode ? null : activePlanId, // Guest mode는 API sync를 사용하지 않음
  );

  const commitPreviewAndExitBoundaryChartEdit = useCallback(() => {
    setStageEndBoundaryChartEditMode(false);
    commitPreview();
  }, [commitPreview]);

  const discardPreviewAndExitBoundaryChartEdit = useCallback(() => {
    setStageEndBoundaryChartEditMode(false);
    discardPreview();
  }, [discardPreview]);

  const handleStageEndBoundaryEditMapCenter = useCallback((distanceKm: number) => {
    setMapCenterOnRouteKmRequest((prev) => ({
      distanceKm,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    setStageEndBoundaryChartEditMode(true);
  }, []);

  const handleExitStageEndBoundaryChartEditMode = useCallback(() => {
    setStageEndBoundaryChartEditMode(false);
    discardPreview();
  }, [discardPreview]);

  useEffect(() => {
    if (!activePlanId) return;
    const nextStages = serializeStagesForPlanCache(stages);
    setDbRoute((prev: DbRouteSnapshot | null) => {
      if (!prev?.plans) return prev;
      const planIndex = prev.plans.findIndex(
        (plan) => plan.id === activePlanId,
      );
      if (planIndex === -1) return prev;
      const targetPlan = prev.plans[planIndex];
      if (isSamePlanStages(targetPlan.stages, nextStages)) return prev;

      const nextPlans = [...prev.plans];
      nextPlans[planIndex] = { ...targetPlan, stages: nextStages };
      return { ...prev, plans: nextPlans };
    });
  }, [activePlanId, stages]);

  // stages 변경 시 selectedDayNumber 유효성 유지. null = 전체 구간 표시
  const effectiveSelectedDay =
    selectedDayNumber === null
      ? null
      : stages.some((s) => s.dayNumber === selectedDayNumber)
        ? selectedDayNumber
        : stages.length > 0
          ? 1
          : null;

  useEffect(() => {
    setStageEndBoundaryChartEditMode(false);
  }, [effectiveSelectedDay]);

  const reviewContext = useMemo(
    () => ({
      routeId,
      planId: activePlanId,
      stageId:
        effectiveSelectedDay != null
          ? (stages.find((s) => s.dayNumber === effectiveSelectedDay)?.id ??
            null)
          : null,
    }),
    [routeId, activePlanId, effectiveSelectedDay, stages],
  );

  /** guest: dbRoute-only persist와 planPois persist를 분리하면 같은 프레임에서 빈 planPois로 LS를 덮을 수 있어 한 effect에서 atomic 저장 */
  useEffect(() => {
    if (!isGuestMode) return;
    if (!isGuestRouteLoaded) return;
    if (!guestPlanPoiPersistReady) return;
    if (!dbRoute) return;
    if (activePlanId) {
      persistGuestRoute({
        nextDbRoute: dbRoute,
        targetPlanId: activePlanId,
        nextPlanPois: planPois,
      });
    } else {
      persistGuestRoute({ nextDbRoute: dbRoute });
    }
  }, [
    isGuestMode,
    isGuestRouteLoaded,
    guestPlanPoiPersistReady,
    dbRoute,
    activePlanId,
    planPois,
    persistGuestRoute,
  ]);

  useEffect(() => {
    if (!activePlanId) {
      setPlanPois([]);
      return;
    }
    if (isGuestMode) {
      const guestRoute = getRouteById(routeId);
      const fromLs = guestRoute?.plan_pois_by_plan_id?.[activePlanId] ?? [];
      setPlanPois(fromLs);
      return;
    }
    let cancelled = false;
    void fetch(`/api/plans/${activePlanId}/pois`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) return [];
        if (!res.ok) return [];
        return res.json() as Promise<PlanPoiRow[]>;
      })
      .then((rows) => {
        if (!cancelled) setPlanPois(rows ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [activePlanId, isGuestMode, getRouteById, routeId]);

  useEffect(() => {
    const query = summitQueryStringForTrackPoints(route?.track_points ?? []);
    if (!query) {
      setOfficialSummits([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/public/summits?${query}`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json() as Promise<SummitCatalogRow[]>;
      })
      .then((rows) => {
        if (!cancelled) setOfficialSummits(rows ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, route?.track_points]);

  const handleCreatePlanPoi = useCallback(
    async (payload: {
      kakao_place_id: string | null;
      name: string;
      poi_type: string;
      memo: string | null;
      lat: number;
      lng: number;
    }) => {
      if (!activePlanId) return null;
      if (isGuestMode) {
        const now = new Date().toISOString();
        const row: PlanPoiRow = {
          id: crypto.randomUUID(),
          plan_id: activePlanId,
          kakao_place_id: payload.kakao_place_id,
          name: payload.name,
          poi_type: payload.poi_type,
          memo: payload.memo,
          lat: payload.lat,
          lng: payload.lng,
          created_at: now,
          updated_at: now,
        };
        setPlanPois((prev) => [...prev, row]);
        return row;
      }
      const res = await fetch(`/api/plans/${activePlanId}/pois`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        alert("로그인 후 저장할 수 있습니다.");
        return null;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(err.error ?? "POI 저장에 실패했습니다.");
        return null;
      }
      const row = (await res.json()) as PlanPoiRow;
      setPlanPois((prev) => [...prev, row]);
      return row;
    },
    [activePlanId, isGuestMode],
  );

  const handleCreateOfficialSummit = useCallback(
    async (payload: {
      name: string;
      lat: number;
      lng: number;
      elevation_m: number | null;
    }) => {
      const res = await fetch("/api/summits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source_route_id: routeId,
          source_plan_id: activePlanId,
        }),
      });
      if (res.status === 401) {
        alert("로그인 후 Summit을 추가할 수 있습니다.");
        return null;
      }
      if (res.status === 403) {
        alert("Summit 추가 권한이 없습니다.");
        return null;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(err.error ?? "Summit 저장에 실패했습니다.");
        return null;
      }
      const row = (await res.json()) as SummitCatalogRow;
      setOfficialSummits((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
      alert("공식 Summit이 추가되었습니다.");
      return row;
    },
    [routeId, activePlanId],
  );

  const handleDeleteOfficialSummit = useCallback(async (summitId: string) => {
    const res = await fetch(`/api/summits/${summitId}`, {
      method: "DELETE",
    });
    if (res.status === 401) {
      alert("로그인 후 Summit을 삭제할 수 있습니다.");
      return false;
    }
    if (res.status === 403) {
      alert("Summit 삭제 권한이 없습니다.");
      return false;
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      alert(err.error ?? "Summit 삭제에 실패했습니다.");
      return false;
    }
    setOfficialSummits((prev) => prev.filter((s) => s.id !== summitId));
    return true;
  }, []);

  const handleUpdatePlanPoi = useCallback(
    async (
      poiId: string,
      payload: { name: string; poi_type: string; memo: string | null },
    ) => {
      if (!activePlanId) return null;
      if (isGuestMode) {
        const updated: PlanPoiRow = {
          id: poiId,
          plan_id: activePlanId,
          kakao_place_id: null,
          name: payload.name,
          poi_type: payload.poi_type,
          memo: payload.memo,
          lat: 0,
          lng: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPlanPois((prev) =>
          prev.map((poi) =>
            poi.id === poiId
              ? {
                  ...poi,
                  name: payload.name,
                  poi_type: payload.poi_type,
                  memo: payload.memo,
                  updated_at: updated.updated_at,
                }
              : poi,
          ),
        );
        return updated;
      }
      const res = await fetch(`/api/plans/${activePlanId}/pois/${poiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        alert("로그인 후 저장할 수 있습니다.");
        return null;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(err.error ?? "POI 수정에 실패했습니다.");
        return null;
      }
      const row = (await res.json()) as PlanPoiRow;
      setPlanPois((prev) => prev.map((p) => (p.id === row.id ? row : p)));
      return row;
    },
    [activePlanId, isGuestMode],
  );

  const handleDeletePlanPoi = useCallback(
    async (poiId: string) => {
      if (!activePlanId) return false;
      if (isGuestMode) {
        setPlanPois((prev) => prev.filter((poi) => poi.id !== poiId));
        return true;
      }
      const res = await fetch(`/api/plans/${activePlanId}/pois/${poiId}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        alert("로그인 후 삭제할 수 있습니다.");
        return false;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        alert(err.error ?? "POI 삭제에 실패했습니다.");
        return false;
      }
      setPlanPois((prev) => prev.filter((p) => p.id !== poiId));
      return true;
    },
    [activePlanId, isGuestMode],
  );

  const routeSummary = useMemo(() => {
    if (!route || !dbRoute) return null;
    return {
      name: dbRoute.name || route.name,
      rwgpsUrl:
        dbRoute.rwgps_url || `https://ridewithgps.com/routes/${route.id}`,
      distanceKm: route.distance / 1000,
      elevationGain: route.elevation_gain,
      elevationLoss: route.elevation_loss,
    };
  }, [route, dbRoute]);

  const activePlanName =
    dbRoute?.plans?.find((p: { id: string }) => p.id === activePlanId)?.name ??
    null;

  const routeStartDate = dbRoute?.start_date ?? null;

  const activePlanStartDate =
    dbRoute?.plans?.find(
      (p: { id: string; start_date?: string | null }) => p.id === activePlanId,
    )?.start_date ?? null;
  const effectivePlanStartDate = activePlanStartDate ?? routeStartDate;

  const handleStageCardSelect = (stageId: string) => {
    setStageEditOpen(false);
    setPoiEditSnap(null);
    setPanelStageId(stageId);
    setActiveStageId(stageId);
    const stage = stages.find((s) => s.id === stageId);
    if (stage) setSelectedDayNumber(stage.dayNumber);
  };

  const handleEditStageFromCard = (stageId: string) => {
    setPoiEditSnap(null);
    setPanelStageId(stageId);
    setActiveStageId(stageId);
    setStageEditOpen(true);
  };

  const handleFocusPlanPoiConsumed = useCallback(() => {
    setFocusPlanPoiRequest(null);
  }, []);

  const requestFocusPlanPoi = useCallback((poiId: string) => {
    setFocusPlanPoiRequest((prev) => ({
      poiId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  const persistStageMeta = useCallback(
    async (
      stageId: string,
      payload: { startName: string; endName: string; memo: string },
    ) => {
      if (isGuestMode) {
        updateStageMeta(stageId, {
          startName: payload.startName,
          endName: payload.endName,
          memo: payload.memo,
        });
        return;
      }
      const res = await fetch(`/api/stages/${stageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo: payload.memo || null,
          start_name: payload.startName || null,
          end_name: payload.endName || null,
        }),
      });
      if (!res.ok) {
        alert("스테이지 저장에 실패했습니다.");
        return;
      }
      updateStageMeta(stageId, {
        startName: payload.startName,
        endName: payload.endName,
        memo: payload.memo,
      });
    },
    [isGuestMode, updateStageMeta],
  );

  const panelStage = useMemo(
    () => stages.find((s) => s.id === panelStageId) ?? null,
    [stages, panelStageId],
  );

  const activePlanRow = useMemo(() => {
    if (!activePlanId || !dbRoute?.plans) return null;
    return (
      (dbRoute.plans as { id: string; schedule_marker_memos?: unknown }[]).find(
        (p) => p.id === activePlanId,
      ) ?? null
    );
  }, [activePlanId, dbRoute?.plans]);

  const scheduleMarkerMemosForPanel = useMemo(
    () => normalizeScheduleMarkerMemos(activePlanRow?.schedule_marker_memos),
    [activePlanRow?.schedule_marker_memos],
  );

  const handleScheduleMarkerMemoSave = useCallback(
    async (rowKey: string, memoTrimmed: string) => {
      if (!activePlanId || !activePlanRow) return;
      const nextMemos = upsertScheduleMarkerMemo(
        activePlanRow.schedule_marker_memos,
        rowKey,
        memoTrimmed,
      );
      if (isGuestMode) {
        setDbRoute((prev: { plans?: { id: string }[] } | null) => {
          if (!prev?.plans) return prev;
          const idx = prev.plans.findIndex((p) => p.id === activePlanId);
          if (idx === -1) return prev;
          const nextPlans = [...prev.plans];
          nextPlans[idx] = {
            ...nextPlans[idx],
            schedule_marker_memos: nextMemos,
          } as (typeof nextPlans)[number];
          return { ...prev, plans: nextPlans };
        });
        return;
      }
      const res = await fetch(`/api/plans/${activePlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_marker_memos: nextMemos }),
      });
      if (!res.ok) {
        alert("메모 저장에 실패했습니다.");
        return;
      }
      const updated = (await res.json()) as {
        schedule_marker_memos?: unknown;
      };
      const normalized = normalizeScheduleMarkerMemos(
        updated.schedule_marker_memos,
      );
      setDbRoute((prev: { plans?: { id: string }[] } | null) => {
        if (!prev?.plans) return prev;
        const idx = prev.plans.findIndex((p) => p.id === activePlanId);
        if (idx === -1) return prev;
        const nextPlans = [...prev.plans];
        nextPlans[idx] = {
          ...nextPlans[idx],
          schedule_marker_memos: normalized,
        } as (typeof nextPlans)[number];
        return { ...prev, plans: nextPlans };
      });
    },
    [activePlanId, activePlanRow, isGuestMode],
  );

  const handleSavePoiFromDialog = useCallback(
    async (payload: { name: string; memo: string }) => {
      if (!poiEditSnap) return;
      const row = planPois.find((p) => p.id === poiEditSnap.id);
      if (!row) return;
      await handleUpdatePlanPoi(poiEditSnap.id, {
        name: payload.name,
        poi_type: row.poi_type,
        memo: payload.memo || null,
      });
    },
    [poiEditSnap, planPois, handleUpdatePlanPoi],
  );

  const handlePlanSelect = useCallback(
    (planId: string) => {
      if (isGuestMode) {
        const guestRoute = getRouteById(routeId);
        setPlanPois(guestRoute?.plan_pois_by_plan_id?.[planId] ?? []);
      }
      setActivePlanId(planId);
      setPanelStageId(null);
      setStageEditOpen(false);
      setPoiEditSnap(null);
      const plan = dbRoute?.plans?.find((p: any) => p.id === planId);
      if (plan) {
        startStagesTransition(() => {
          setDbStages(normalizeDbStages(plan.stages || []));
        });
      }
    },
    [dbRoute?.plans, isGuestMode, getRouteById, routeId],
  );

  const handleUpdatePlan = useCallback(
    async (planId: string, newName: string) => {
      setPlanActionInProgress("update");
      try {
        if (isGuestMode) {
          setDbRoute((prev: any) => ({
            ...prev,
            plans: (prev?.plans ?? []).map((plan: any) =>
              plan.id === planId ? { ...plan, name: newName } : plan,
            ),
          }));
          return;
        }
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        if (!res.ok) throw new Error("Plan update failed");
        setDbRoute((prev: any) => ({
          ...prev,
          plans: (prev?.plans ?? []).map((p: any) =>
            p.id === planId ? { ...p, name: newName } : p,
          ),
        }));
      } catch (err) {
        console.error(err);
        alert("플랜 이름 수정에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [isGuestMode],
  );

  const handleDeletePlan = useCallback(
    async (planId: string) => {
      setPlanActionInProgress("delete");
      try {
        if (!isGuestMode) {
          const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Plan delete failed");
        }
        const prevPlans = dbRoute?.plans ?? [];
        const nextPlans = prevPlans.filter((p: any) => p.id !== planId);
        setDbRoute((prev: any) => ({ ...prev, plans: nextPlans }));
        if (activePlanId === planId) {
          const nextPlan = nextPlans[0];
          if (nextPlan) {
            setActivePlanId(nextPlan.id);
            setDbStages(normalizeDbStages(nextPlan.stages || []));
          } else {
            setActivePlanId(null);
            setDbStages([]);
          }
        }
      } catch (err) {
        console.error(err);
        alert("플랜 삭제에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [dbRoute?.plans, activePlanId, isGuestMode],
  );

  const handleDuplicatePlan = useCallback(
    async (plan: { id: string; name: string; stages?: unknown[] }) => {
      setPlanActionInProgress("duplicate");
      try {
        const newName = `Copy of ${plan.name}`;
        if (isGuestMode) {
          const nowIso = new Date().toISOString();
          const createdStages = ((plan.stages ?? []) as DbStage[]).map((stage) => ({
            ...stage,
            id: crypto.randomUUID(),
          }));
          const guestRoute = getRouteById(routeId);
          const sourcePlanPois = guestRoute?.plan_pois_by_plan_id?.[plan.id] ?? [];
          const newPlan = {
            id: crypto.randomUUID(),
            name: newName,
            start_date: null,
            sort_order: (dbRoute?.plans?.length ?? 0) + 1,
            created_at: nowIso,
            updated_at: nowIso,
          };
          const sourcePlanRow =
            (dbRoute?.plans ?? []).find((p: { id: string }) => p.id === plan.id) ??
            plan;
          const clonedMemos = normalizeScheduleMarkerMemos(
            (sourcePlanRow as { schedule_marker_memos?: unknown })
              .schedule_marker_memos,
          );
          const clonedPlanPois = sourcePlanPois.map((poi) => ({
            ...poi,
            id: crypto.randomUUID(),
            plan_id: newPlan.id,
            created_at: nowIso,
            updated_at: nowIso,
          }));
          setDbRoute((prev: any) => ({
            ...prev,
            plans: [
              ...(prev?.plans ?? []),
              {
                ...newPlan,
                stages: createdStages,
                ...(clonedMemos != null ? { schedule_marker_memos: clonedMemos } : {}),
              },
            ],
          }));
          setActivePlanId(newPlan.id);
          setDbStages(normalizeDbStages(createdStages));
          setPlanPois(clonedPlanPois);
          return;
        }
        const planRes = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route_id: routeId, name: newName }),
        });
        if (!planRes.ok) throw new Error("Plan creation failed");
        const newPlan = await planRes.json();

        const rawStages = (plan.stages ?? []) as {
          start_distance: number;
          end_distance: number;
          elevation_gain?: number | null;
          elevation_loss?: number | null;
          title?: string | null;
          memo?: string | null;
        }[];
        const sortedStages = [...rawStages].sort(
          (a, b) => a.start_distance - b.start_distance,
        );
        const createdStages: DbStage[] = [];
        for (const s of sortedStages) {
          const stageRes = await fetch("/api/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan_id: newPlan.id,
              start_distance: s.start_distance,
              end_distance: s.end_distance,
              elevation_gain: s.elevation_gain ?? null,
              elevation_loss: s.elevation_loss ?? null,
              title: s.title ?? null,
              memo: s.memo ?? null,
            }),
          });
          if (!stageRes.ok) throw new Error("Stage creation failed");
          createdStages.push(await stageRes.json());
        }

        const sourcePoiRes = await fetch(`/api/plans/${plan.id}/pois`);
        const sourcePois = sourcePoiRes.ok
          ? ((await sourcePoiRes.json()) as PlanPoiRow[])
          : [];
        const clonedPois: PlanPoiRow[] = [];
        for (const poi of sourcePois) {
          const poiRes = await fetch(`/api/plans/${newPlan.id}/pois`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kakao_place_id: poi.kakao_place_id,
              name: poi.name,
              poi_type: poi.poi_type,
              memo: poi.memo,
              lat: poi.lat,
              lng: poi.lng,
            }),
          });
          if (!poiRes.ok) throw new Error("Plan POI copy failed");
          clonedPois.push((await poiRes.json()) as PlanPoiRow);
        }

        const sourcePlanRowDb =
          (dbRoute?.plans ?? []).find((p: { id: string }) => p.id === plan.id) ??
          plan;
        const clonedScheduleMemos = normalizeScheduleMarkerMemos(
          (sourcePlanRowDb as { schedule_marker_memos?: unknown })
            .schedule_marker_memos,
        );
        if (clonedScheduleMemos != null) {
          const memoPut = await fetch(`/api/plans/${newPlan.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schedule_marker_memos: clonedScheduleMemos,
            }),
          });
          if (!memoPut.ok) throw new Error("Plan schedule marker memos copy failed");
        }

        setDbRoute((prev: any) => ({
          ...prev,
          plans: [
            ...(prev?.plans ?? []),
            {
              ...newPlan,
              stages: createdStages,
              ...(clonedScheduleMemos != null
                ? { schedule_marker_memos: clonedScheduleMemos }
                : {}),
            },
          ],
        }));
        setActivePlanId(newPlan.id);
        setDbStages(normalizeDbStages(createdStages));
        setPlanPois(clonedPois);
      } catch (err) {
        console.error(err);
        alert("플랜 복제에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [routeId, isGuestMode, dbRoute?.plans, getRouteById],
  );

  const handleReorderPlans = useCallback(
    async (planIds: string[]) => {
      const prevPlans = dbRoute?.plans ?? [];
      const orderMap = new Map(planIds.map((id, i) => [id, i]));
      const reorderedPlans = [...prevPlans].sort(
        (a: any, b: any) =>
          (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
      setDbRoute((prev: any) => ({ ...prev, plans: reorderedPlans }));
      setIsReorderingPlans(true);
      try {
        if (isGuestMode) return;
        const res = await fetch(`/api/routes/${routeId}/plans/order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planIds }),
        });
        if (!res.ok) throw new Error("Plan reorder failed");
      } catch (err) {
        console.error(err);
        setDbRoute((prev: any) => ({ ...prev, plans: prevPlans }));
        alert("플랜 순서 변경에 실패했습니다.");
      } finally {
        setIsReorderingPlans(false);
      }
    },
    [dbRoute?.plans, routeId, isGuestMode],
  );

  const handleUpdatePlanStartDateByPlanId = useCallback(
    async (planId: string, startDate: string | null) => {
      try {
        if (isGuestMode) {
          setDbRoute((prev: any) => ({
            ...prev,
            plans: (prev?.plans ?? []).map((plan: any) =>
              plan.id === planId ? { ...plan, start_date: startDate } : plan,
            ),
          }));
          return;
        }
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_date: startDate }),
        });
        if (!res.ok) throw new Error("Plan start date update failed");
        setDbRoute((prev: any) => ({
          ...prev,
          plans: (prev?.plans ?? []).map((p: any) =>
            p.id === planId ? { ...p, start_date: startDate } : p,
          ),
        }));
      } catch (err) {
        console.error(err);
        alert("시작일 저장에 실패했습니다.");
      }
    },
    [isGuestMode],
  );

  const handleTogglePlanShare = useCallback(
    async (planId: string, enabled: boolean) => {
      setPlanActionInProgress("share");
      try {
        if (isGuestMode) {
          alert("guest 모드에서는 공유 링크를 생성할 수 없습니다.");
          return;
        }
        const res = await fetch(`/api/plans/${planId}/share`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        if (!res.ok) throw new Error("Plan share update failed");
        const data = (await res.json()) as {
          public_share_token: string | null;
          shared_at: string | null;
        };
        setDbRoute((prev: any) => ({
          ...prev,
          plans: (prev?.plans ?? []).map((plan: any) =>
            plan.id === planId
              ? {
                  ...plan,
                  public_share_token: data.public_share_token,
                  shared_at: data.shared_at,
                }
              : plan,
          ),
        }));
        if (enabled && data.public_share_token) {
          alert("공개 링크가 생성되었습니다. 메뉴에서 링크를 복사하세요.");
        } else {
          alert("공개 링크가 해제되었습니다.");
        }
      } catch (err) {
        console.error(err);
        alert("공개 공유 설정에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [isGuestMode],
  );

  const handleCopyPlanShareLink = useCallback(async (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("공유 링크를 복사했습니다.");
    } catch (err) {
      console.error(err);
      alert(`링크 복사에 실패했습니다. 수동으로 복사하세요: ${shareUrl}`);
    }
  }, []);

  const planActionMessage =
    planActionInProgress === "duplicate"
      ? "플랜 복제 중…"
      : planActionInProgress === "delete"
        ? "플랜 삭제 중…"
        : planActionInProgress === "update"
          ? "이름 수정 중…"
          : planActionInProgress === "create"
            ? "플랜 추가 중…"
            : planActionInProgress === "share"
              ? "공유 설정 반영 중…"
              : "";

  return (
    <>
      {planActionInProgress !== null && (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-black/40"
          aria-live="polite"
          aria-busy="true"
        >
          <svg
            className="h-10 w-10 animate-spin text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium text-white drop-shadow-md">
            {planActionMessage}
          </span>
        </div>
      )}

      {/* ── 좌측 2단 사이드바 ── */}
      <aside className="hidden shrink-0 flex-row overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        {loading ? (
          <div className="flex w-80 items-center gap-2 p-4">
            <svg
              className="h-4 w-4 animate-spin text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-zinc-500">
              {isGuestMode ? "guest 경로 불러오는 중…" : "경로 불러오는 중…"}
            </span>
          </div>
        ) : error ? (
          <div className="w-80 p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <PlanListPane
              routeSummary={routeSummary ?? undefined}
              plans={dbRoute?.plans ?? []}
              activePlanId={activePlanId}
              isReorderingPlans={isReorderingPlans}
              onSelectPlan={handlePlanSelect}
              onUpdatePlan={handleUpdatePlan}
              onUpdatePlanStartDate={handleUpdatePlanStartDateByPlanId}
              onDuplicatePlan={handleDuplicatePlan}
              onDeletePlan={handleDeletePlan}
              onTogglePlanShare={handleTogglePlanShare}
              onCopyPlanShareLink={handleCopyPlanShareLink}
              onReorderPlans={handleReorderPlans}
              newPlanName={newPlanName}
              setNewPlanName={setNewPlanName}
              onSubmitNewPlan={handleCreatePlan}
              isCreatingPlan={isCreatingPlan}
              isCollapsed={planListCollapsed}
              onToggleCollapse={() => setPlanListCollapsed((c) => !c)}
            />
              <PlanStagesPane
                planName={activePlanName}
                planId={activePlanId}
                planStartDate={effectivePlanStartDate}
                stages={stages}
                activeStageId={activeStageId}
                setActiveStageId={setActiveStageId}
                panelStageId={panelStageId}
                onStageSelect={handleStageCardSelect}
                onEditStage={handleEditStageFromCard}
                totalRouteDistanceKm={totalRouteDistanceKm}
                unplannedDistanceKm={unplannedDistanceKm}
                updateStageDistance={updateStageDistance}
                requestDeleteStage={requestDeleteStage}
                addStage={addStage}
                addLastStage={addLastStage}
                isPending={isStagesPending}
              />
              <div
                className={cn(
                  "flex min-h-0 shrink-0 flex-col overflow-hidden border-zinc-200 bg-white transition-[width] duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900",
                  panelStageId
                    ? "w-80 border-r"
                    : "w-0 border-r border-transparent",
                )}
              >
                {panelStage ? (
                  <motion.div
                    key={panelStage.id}
                    initial={{ x: -28, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-h-0 h-full w-80 shrink-0 flex-col"
                  >
                    <StageDetailPanel
                      stage={panelStage}
                      dateLabel={stageDayLabel(
                        panelStage.dayNumber,
                        effectivePlanStartDate,
                      )}
                      trackPoints={route?.track_points ?? []}
                      elevationCalibratedThreshold={calibratedThreshold}
                      planPois={planPois}
                      cpMarkers={cpMarkers}
                      summitMarkers={summitMarkers}
                      scheduleMarkerMemos={scheduleMarkerMemosForPanel}
                      onScheduleMarkerMemoSave={handleScheduleMarkerMemoSave}
                      onClose={() => {
                        setPanelStageId(null);
                        setStageEditOpen(false);
                      }}
                      onEditStage={() => {
                        setStageEditOpen(true);
                      }}
                      onDeleteStage={requestDeleteStage}
                      onPoiRowClick={requestFocusPlanPoi}
                      onEditPoi={(poi) => {
                        setStageEditOpen(false);
                        setPoiEditSnap(poi);
                      }}
                      onDeletePoi={handleDeletePlanPoi}
                    />
                  </motion.div>
                ) : null}
              </div>
          </>
        )}
      </aside>

      {/* ── 오른쪽 컬럼: 지도 + 고도 프로필 ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 지도 */}
        <section className="relative min-h-0 flex-1">
          {loading && (
            <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-zinc-800">
                <svg
                  className="h-5 w-5 animate-spin text-orange-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  경로 불러오는 중…
                </span>
              </div>
            </div>
          )}
          {!loading && (
            <KakaoMap
              route={route}
              stages={stages}
              activeStageId={activeStageId}
              onStageHover={setActiveStageId}
              highlightPosition={
                stageEndBoundaryChartEditMode
                  ? null
                  : positionIndex != null && route?.track_points?.[positionIndex]
                    ? [
                        route.track_points[positionIndex].y,
                        route.track_points[positionIndex].x,
                      ]
                    : null
              }
              onPositionChange={setPositionIndex}
              trackPoints={route?.track_points ?? []}
              isPinned={isPinned}
              onPin={handlePin}
              onUnpin={handleUnpin}
              reviewContext={reviewContext}
              activePlanId={activePlanId}
              planPois={planPois}
              officialSummits={officialSummits}
              onCreateOfficialSummit={handleCreateOfficialSummit}
              onDeleteOfficialSummit={handleDeleteOfficialSummit}
              onCreatePlanPoi={handleCreatePlanPoi}
              onUpdatePlanPoi={handleUpdatePlanPoi}
              onDeletePlanPoi={handleDeletePlanPoi}
              focusPlanPoiRequest={focusPlanPoiRequest}
              onFocusPlanPoiConsumed={handleFocusPlanPoiConsumed}
              mapCenterOnRouteKmRequest={mapCenterOnRouteKmRequest}
              onMapCenterOnRouteKmConsumed={handleMapCenterOnRouteKmConsumed}
              boundaryPreviewEndKm={
                stageEndBoundaryChartEditMode && pendingStageEdit
                  ? pendingStageEdit.previewEndKm
                  : null
              }
              suspendPlanMapElevationSync={stageEndBoundaryChartEditMode}
            />
          )}
        </section>

        {/* 고도 프로필 */}
        <section className="hidden h-56 shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <ElevationProfile
            trackPoints={route?.track_points ?? []}
            stages={stages}
            activeStageId={activeStageId}
            positionIndex={positionIndex}
            onPositionChange={setPositionIndex}
            selectedDayNumber={effectiveSelectedDay}
            onSelectedDayChange={(day) => setSelectedDayNumber(day)}
            pendingStageEdit={pendingStageEdit}
            previewStageStats={previewStageStats}
            onStartBoundaryDrag={startBoundaryPreview}
            onPreviewMove={(_, previewEndKm) =>
              updatePreviewEndKm(previewEndKm)
            }
            onCommitPreview={commitPreviewAndExitBoundaryChartEdit}
            onDiscardPreview={discardPreviewAndExitBoundaryChartEdit}
            isPinned={isPinned}
            onPin={handlePin}
            onUnpin={handleUnpin}
            elevationCalibratedThreshold={calibratedThreshold}
            cpMarkers={cpMarkers}
            summitMarkers={summitMarkers}
            onStageEndBoundaryEditMapCenter={handleStageEndBoundaryEditMapCenter}
            stageEndBoundaryChartEditMode={stageEndBoundaryChartEditMode}
            onExitStageEndBoundaryChartEditMode={handleExitStageEndBoundaryChartEditMode}
          />
        </section>
      </div>

      {/* ── 다이얼로그 ── */}
      {pendingDeletion && (
        <PendingDeletionDialog
          pending={pendingDeletion}
          onConfirm={() => {
            // 현재 Stage의 거리를 다음 Stage 시작까지로 확장
            const stageIdx = stages.findIndex(
              (s) => s.id === pendingDeletion.stageId,
            );
            if (stageIdx !== -1) {
              const currentStage = stages[stageIdx];
              const nextStage = stages[stageIdx + 1];
              if (nextStage) {
                confirmNextStageDeletion(
                  currentStage.distanceKm + nextStage.distanceKm,
                );
              }
            }
          }}
          onCancel={cancelPendingDeletion}
        />
      )}

      {deleteConfirmation && (
        <DeleteConfirmationDialog
          confirmation={deleteConfirmation}
          onExecute={executeDeleteStage}
          onCancel={cancelDeleteConfirmation}
        />
      )}

      <StageEditDialog
        open={stageEditOpen && panelStage != null}
        stage={panelStage}
        onOpenChange={setStageEditOpen}
        onSave={async (payload) => {
          if (!panelStage) return;
          await persistStageMeta(panelStage.id, payload);
        }}
      />

      <PoiEditDialog
        open={poiEditSnap != null}
        poi={poiEditSnap}
        onOpenChange={(open) => {
          if (!open) setPoiEditSnap(null);
        }}
        onSave={handleSavePoiFromDialog}
      />
    </>
  );
}
