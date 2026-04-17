"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CPOnRoute, SummitOnRoute, TrackPoint } from "./ElevationProfile";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import { calibrateThreshold } from "../hooks/usePlanStages";
import type { PlanPoiRow } from "../types/planPoi";
import type { SummitCatalogRow } from "../types/summitCatalog";
import { getStageColor, type Stage } from "../types/plan";

type MobileSharedPlanMapTabProps = {
  route: RideWithGPSRoute | null;
  stages: Stage[];
  trackPoints: TrackPoint[];
  planPois: PlanPoiRow[];
  officialSummits: SummitCatalogRow[];
  activePlanId: string | null;
  knownRouteElevationGainM: number;
  cpMarkers: CPOnRoute[];
  summitMarkers: SummitOnRoute[];
};

export function MobileSharedPlanMapTab({
  route,
  stages,
  trackPoints,
  planPois,
  officialSummits,
  activePlanId,
  knownRouteElevationGainM,
  cpMarkers,
  summitMarkers,
}: MobileSharedPlanMapTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      if (el.clientHeight > 0 && el.clientWidth > 0) setHasSize(true);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveSelectedDay =
    selectedDayNumber !== null &&
    stages.some((stage) => stage.dayNumber === selectedDayNumber)
      ? selectedDayNumber
      : null;

  const activeStageId = useMemo(() => {
    if (effectiveSelectedDay == null) return null;
    return stages.find((s) => s.dayNumber === effectiveSelectedDay)?.id ?? null;
  }, [stages, effectiveSelectedDay]);

  const elevationCalibratedThreshold = useMemo(
    () => calibrateThreshold(trackPoints, knownRouteElevationGainM),
    [trackPoints, knownRouteElevationGainM],
  );

  const isLoading = route === null || !hasSize;

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {isLoading ? (
        <div className="flex size-full items-center justify-center bg-muted/40">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-sm dark:bg-zinc-800">
            <Loader2 className="size-4 animate-spin text-orange-500" aria-hidden />
            <span className="text-sm text-muted-foreground">
              경로 지도 불러오는 중...
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 basis-[65%] grow overflow-hidden">
            <KakaoMap
              route={route}
              stages={stages}
              activeStageId={activeStageId}
              trackPoints={route.track_points ?? []}
              planPois={planPois}
              officialSummits={officialSummits}
              activePlanId={activePlanId}
              readOnly
              suspendPlanMapElevationSync
            />
          </div>
          <div className="flex min-h-0 basis-[35%] grow flex-col overflow-hidden border-t border-border bg-background">
            {stages.length > 0 ? (
              <div className="flex shrink-0 gap-1 overflow-x-auto px-2 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stages.map((s) => {
                  const color = getStageColor(s.dayNumber);
                  const isSel = effectiveSelectedDay === s.dayNumber;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setSelectedDayNumber(isSel ? null : s.dayNumber)
                      }
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        isSel
                          ? "text-white"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                      style={isSel ? { backgroundColor: color.stroke } : undefined}
                    >
                      {s.dayNumber}일
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col">
              <ElevationProfile
                trackPoints={trackPoints}
                stages={stages}
                elevationCalibratedThreshold={elevationCalibratedThreshold}
                selectedDayNumber={effectiveSelectedDay}
                onSelectedDayChange={setSelectedDayNumber}
                activeStageId={activeStageId}
                hideChips
                compactYAxis
                disablePinAndHoverScrub
                compactTooltip
                cpMarkers={cpMarkers}
                summitMarkers={summitMarkers}
                labelLayout="stagger"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
