"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenIcon } from "lucide-react";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import type { PlanPoiRow } from "../types/planPoi";
import type { SummitCatalogRow } from "../types/summitCatalog";
import { computeCPsOnRoute, computeSummitsOnRoute } from "./RouteViewer";
import { getStageColor, type Stage } from "../types/plan";
import { stageDayLabel } from "./PlanStagesPane";
import { MemoReviewPane } from "./MemoReviewPane";
import { RouteSummaryBlock } from "./RouteSummaryBlock";
import { SharePlanDuplicateCta } from "./SharePlanDuplicateCta";
import { MobileSharedPlanLayout } from "./MobileSharedPlanLayout";

export type PublicPlanResponse = {
  plan: {
    id: string;
    name: string;
    start_date: string | null;
    public_share_token: string;
    shared_at: string | null;
  };
  route: {
    name: string;
    rwgps_url: string;
    total_distance: number | null;
    elevation_gain: number | null;
    elevation_loss: number | null;
    cover_image_hero_url: string | null;
    cover_image_og_url: string | null;
  };
  stages: {
    id: string;
    title: string | null;
    start_distance: number | null;
    end_distance: number | null;
    elevation_gain: number | null;
    elevation_loss: number | null;
    memo: string | null;
  }[];
  plan_pois: PlanPoiRow[];
  author: { nickname: string | null };
};

type PublicPlanViewerProps = {
  token: string;
};

function summitQueryStringForRoute(route: RideWithGPSRoute | null): string | null {
  const trackPoints = route?.track_points ?? [];
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

export function PublicPlanViewer({ token }: PublicPlanViewerProps) {
  const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
  const [publicPlan, setPublicPlan] = useState<PublicPlanResponse | null>(null);
  const [planPois, setPlanPois] = useState<PlanPoiRow[]>([]);
  const [officialSummits, setOfficialSummits] = useState<SummitCatalogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [positionIndex, setPositionIndex] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  );
  const [isMemoReviewOpen, setIsMemoReviewOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPublic = async () => {
      setRoute(null);
      setError(null);

      try {
        const publicRes = await fetch(`/api/public/plans/${token}`);
        if (!publicRes.ok) throw new Error("공유 플랜을 불러오지 못했습니다.");
        const publicJson = (await publicRes.json()) as PublicPlanResponse;
        if (cancelled) return;
        setPublicPlan(publicJson);
        setPlanPois(publicJson.plan_pois ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    };

    void loadPublic();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!publicPlan || route) return;

    let cancelled = false;

    const loadRoute = async () => {
      setError(null);
      try {
        const rwgpsMatch = publicPlan.route.rwgps_url.match(/\/routes\/(\d+)/);
        const rwgpsId = rwgpsMatch?.[1];
        if (!rwgpsId) throw new Error("경로 정보를 해석할 수 없습니다.");

        const routeRes = await fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
        if (!routeRes.ok) throw new Error("경로 지도를 불러오지 못했습니다.");
        const routeJson = (await routeRes.json()) as RideWithGPSRoute;
        if (cancelled) return;
        setRoute(routeJson);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    };

    void loadRoute();
    return () => {
      cancelled = true;
    };
  }, [publicPlan, route]);

  useEffect(() => {
    const query = summitQueryStringForRoute(route);
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

  const stages = useMemo<Stage[]>(() => {
    const source = publicPlan?.stages ?? [];
    const sorted = [...source].sort(
      (a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0),
    );
    return sorted.map((stage, index) => {
      const startDistanceM = stage.start_distance ?? 0;
      const endDistanceM = stage.end_distance ?? startDistanceM;
      return {
        id: stage.id,
        dayNumber: index + 1,
        distanceKm: (endDistanceM - startDistanceM) / 1000,
        startDistanceKm: startDistanceM / 1000,
        endDistanceKm: endDistanceM / 1000,
        elevationGain: Number(stage.elevation_gain) || 0,
        elevationLoss: Number(stage.elevation_loss) || 0,
        isLastStage: false,
        memo: stage.memo ?? undefined,
        title: stage.title ?? null,
      };
    });
  }, [publicPlan?.stages]);

  const totalRouteDistanceKm = route?.distance
    ? route.distance / 1000
    : (publicPlan?.route.total_distance ?? 0) / 1000;

  const unplannedDistanceKm =
    stages.length === 0
      ? totalRouteDistanceKm
      : Math.max(
          0,
          totalRouteDistanceKm - (stages[stages.length - 1]?.endDistanceKm ?? 0),
        );

  const effectiveSelectedDay =
    selectedDayNumber !== null &&
    stages.some((stage) => stage.dayNumber === selectedDayNumber)
      ? selectedDayNumber
      : null;

  /** RouteViewer·PlanListPane과 동일하게 RWGPS 응답 우선, 없으면 DB 스냅샷 */
  const publicRouteSummary =
    publicPlan == null
      ? null
      : {
          name: publicPlan.route.name || route?.name || "경로",
          rwgpsUrl:
            publicPlan.route.rwgps_url ||
            (route != null ? `https://ridewithgps.com/routes/${route.id}` : ""),
          distanceMeters: route?.distance ?? publicPlan.route.total_distance ?? 0,
          elevationGain: route
            ? Number(route.elevation_gain) || 0
            : Number(publicPlan.route.elevation_gain) || 0,
          elevationLoss: route
            ? Number(route.elevation_loss) || 0
            : Number(publicPlan.route.elevation_loss) || 0,
        };

  const mobileStats =
    publicPlan == null
      ? null
      : {
          totalDistanceKm:
            (route?.distance ?? publicPlan.route.total_distance ?? 0) / 1000,
          totalElevationGainM: route
            ? Number(route.elevation_gain) || 0
            : Number(publicPlan.route.elevation_gain) || 0,
          totalDays: stages.length,
          createdByLabel: publicPlan.author?.nickname?.trim() || "작성자",
        };

  const distRoundedKm = Math.round(totalRouteDistanceKm);
  const sharedSummaryRouteDescription =
    publicPlan == null
      ? ""
      : stages.length > 0
        ? `${publicPlan.route.name?.trim() || "경로"} 약 ${distRoundedKm}km 구간을 ${stages.length}일로 나눈 ${publicPlan.plan.name?.trim() || "플랜"}입니다.`
        : `${publicPlan.route.name?.trim() || "경로"}에 대한 ${publicPlan.plan.name?.trim() || "플랜"}입니다.`;

  const maxElevRaw =
    route?.track_points?.reduce<number>(
      (m, p) => (typeof p.e === "number" && p.e > m ? p.e : m),
      -Infinity,
    ) ?? -Infinity;
  const sharedSummaryMaxElevationM = Number.isFinite(maxElevRaw)
    ? Math.round(maxElevRaw)
    : null;

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

  const handlePin = (index: number) => {
    setPositionIndex(index);
    setIsPinned(true);
  };

  const handleUnpin = () => {
    setIsPinned(false);
  };

  const awaitingPublic = !error && !publicPlan;
  const awaitingViewport = !error && publicPlan != null && isDesktop === null;
  const awaitingRoute =
    !error &&
    publicPlan != null &&
    isDesktop === true &&
    route === null;

  if (awaitingPublic || awaitingViewport || awaitingRoute) {
    const loaderLabel = awaitingRoute
      ? "경로 지도 불러오는 중..."
      : "공유 플랜 불러오는 중...";
    return (
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
            {loaderLabel}
          </span>
        </div>
      </div>
    );
  }

  if (error || !publicPlan) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-800">
        <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400">
          {error ?? "공유 플랜을 찾을 수 없습니다."}
        </div>
      </div>
    );
  }

  if (isDesktop === false) {
    const ms = mobileStats!;
    return (
      <MobileSharedPlanLayout
        token={token}
        routeName={publicPlan.route.name}
        planName={publicPlan.plan.name}
        createdByLabel={ms.createdByLabel}
        totalDistanceKm={ms.totalDistanceKm}
        totalElevationGainM={ms.totalElevationGainM}
        totalDays={ms.totalDays}
        heroImageUrl={publicPlan.route.cover_image_hero_url}
        heroImageFallbackUrl={publicPlan.route.cover_image_og_url}
        summaryStages={stages}
        summaryTrackPoints={route?.track_points ?? []}
        summaryRouteDescription={sharedSummaryRouteDescription}
        summaryMaxElevationM={sharedSummaryMaxElevationM}
        planStartDate={publicPlan.plan.start_date}
        stagesPlanPois={planPois}
        stagesCpMarkers={cpMarkers}
        stagesSummitMarkers={summitMarkers}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      {isMemoReviewOpen ? (
        <div className="hidden shrink-0 lg:flex">
          <MemoReviewPane
            stages={stages}
            planStartDate={publicPlan.plan.start_date}
            onClose={() => setIsMemoReviewOpen(false)}
            readOnly
          />
        </div>
      ) : (
        <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            {publicRouteSummary ? (
              <RouteSummaryBlock
                name={publicRouteSummary.name}
                rwgpsUrl={publicRouteSummary.rwgpsUrl}
                distanceMeters={publicRouteSummary.distanceMeters}
                elevationGain={publicRouteSummary.elevationGain}
                elevationLoss={publicRouteSummary.elevationLoss}
              />
            ) : null}
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {publicPlan.plan.name}
            </h3>
            {publicPlan.author?.nickname ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                작성 · {publicPlan.author.nickname}
              </p>
            ) : null}
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{stages.length}일 계획</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMemoReviewOpen(true)}
              className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              메모 리뷰
            </button>
            <SharePlanDuplicateCta token={token} />
          </div>
          <div className="space-y-2 p-4">
            {stages.map((stage) => {
              const color = getStageColor(stage.dayNumber);
              const isActive = activeStageId === stage.id;
              return (
                <div
                  key={stage.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isActive
                      ? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                  onMouseEnter={() => setActiveStageId(stage.id)}
                  onMouseLeave={() => setActiveStageId(null)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: color.stroke }}
                    >
                      {stage.dayNumber}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        스테이지 {stage.dayNumber}
                      </p>
                      {publicPlan.plan.start_date && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {stageDayLabel(
                            stage.dayNumber,
                            publicPlan.plan.start_date,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                    거리 {stage.distanceKm.toFixed(1)}km / 상승{" "}
                    {Math.round(stage.elevationGain)}m
                  </div>
                  {stage.memo && (
                    <p className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {stage.memo}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-auto border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            미계획 구간 {unplannedDistanceKm.toFixed(1)}km
          </div>
        </aside>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <section className="relative min-h-0 flex-1">
          <KakaoMap
            route={route}
            stages={stages}
            activeStageId={activeStageId}
            onStageHover={setActiveStageId}
            highlightPosition={
              positionIndex != null && route?.track_points?.[positionIndex]
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
            reviewContext={{ routeId: "", planId: null, stageId: null }}
            activePlanId={publicPlan.plan.id}
            planPois={planPois}
            officialSummits={officialSummits}
            readOnly
          />
        </section>

        <section className="hidden h-56 shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <ElevationProfile
            trackPoints={route?.track_points ?? []}
            stages={stages}
            activeStageId={activeStageId}
            positionIndex={positionIndex}
            onPositionChange={setPositionIndex}
            selectedDayNumber={effectiveSelectedDay}
            onSelectedDayChange={(day) => setSelectedDayNumber(day)}
            isPinned={isPinned}
            onPin={handlePin}
            onUnpin={handleUnpin}
            cpMarkers={cpMarkers}
            summitMarkers={summitMarkers}
          />
        </section>
      </div>
    </div>
  );
}
