"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import type { PlanPoiRow } from "../types/planPoi";
import type { SummitCatalogRow } from "../types/summitCatalog";
import type { Stage } from "../types/plan";

type MobileSharedPlanMapTabProps = {
  route: RideWithGPSRoute | null;
  stages: Stage[];
  planPois: PlanPoiRow[];
  officialSummits: SummitCatalogRow[];
  activePlanId: string | null;
};

export function MobileSharedPlanMapTab({
  route,
  stages,
  planPois,
  officialSummits,
  activePlanId,
}: MobileSharedPlanMapTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);

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

  const isLoading = route === null || !hasSize;

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1">
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
        <KakaoMap
          route={route}
          stages={stages}
          trackPoints={route.track_points ?? []}
          planPois={planPois}
          officialSummits={officialSummits}
          activePlanId={activePlanId}
          readOnly
          suspendPlanMapElevationSync
        />
      )}
    </div>
  );
}
