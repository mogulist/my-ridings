"use client";

import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mountain,
} from "lucide-react";
import { Badge, cn } from "@my-ridings/ui";
import type { TrackPoint } from "./ElevationProfile";
import { ElevationProfile } from "./ElevationProfile";
import { stageDayLabel } from "./PlanStagesPane";
import type { Stage } from "../types/plan";
import { getStageColor } from "../types/plan";
import type { PlanPoiRow } from "../types/planPoi";
import {
  MOBILE_PLAN_ELEV_PANEL_HEIGHT_PX,
  MOBILE_PLAN_TAB_BAR_HEIGHT_PX,
} from "./mobileSharedPlanConstants";

// ── 스냅 POI / 구간 고도 ─────────────────────────────────────────

export type SnappedPlanPoi = {
  id: string;
  name: string;
  poiType: string;
  memo: string | null;
  distanceKm: number;
  elevation: number;
};

export function snapPlanPoisToTrack(
  planPois: PlanPoiRow[],
  trackPoints: TrackPoint[],
): SnappedPlanPoi[] {
  if (trackPoints.length === 0 || planPois.length === 0) return [];
  const out: SnappedPlanPoi[] = [];
  for (const poi of planPois) {
    let bestIdx = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < trackPoints.length; i++) {
      const tp = trackPoints[i];
      const d2 = (tp.y - poi.lat) ** 2 + (tp.x - poi.lng) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = i;
      }
    }
    const tp = trackPoints[bestIdx];
    if (tp?.d == null || tp.e == null) continue;
    out.push({
      id: poi.id,
      name: poi.name,
      poiType: poi.poi_type,
      memo: poi.memo,
      distanceKm: tp.d / 1000,
      elevation: Math.round(tp.e),
    });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function maxElevationInStageRange(
  trackPoints: TrackPoint[],
  startKm: number,
  endKm: number,
): number | null {
  const withEle = trackPoints.filter((p) => p.e != null && p.d != null);
  if (withEle.length === 0) return null;
  let max = -Infinity;
  for (const p of withEle) {
    const km = p.d! / 1000;
    if (km >= startKm && km <= endKm && p.e! > max) max = p.e!;
  }
  return Number.isFinite(max) ? Math.round(max) : null;
}

export function poisForStage(
  snapped: SnappedPlanPoi[],
  stage: Stage,
): SnappedPlanPoi[] {
  return snapped.filter(
    (p) =>
      p.distanceKm >= stage.startDistanceKm &&
      p.distanceKm <= stage.endDistanceKm,
  );
}

const POI_TYPE_LABEL_KO: Record<string, string> = {
  convenience: "편의점",
  mart: "마트",
  accommodation: "숙소",
  cafe: "카페",
  restaurant: "식당",
};

function planPoiTypeLabelKo(poiType: string): string {
  return POI_TYPE_LABEL_KO[poiType] ?? poiType;
}

// ── Plain collapsible (controlled) ───────────────────────────────

type CollapsibleCtx = { open: boolean; toggle: () => void };

const CollapsibleContext = createContext<CollapsibleCtx>({
  open: false,
  toggle: () => {},
});

type PlainCollapsibleProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
};

function PlainCollapsible({ open, onOpenChange, children }: PlainCollapsibleProps) {
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);
  return (
    <CollapsibleContext.Provider value={{ open, toggle }}>
      {children}
    </CollapsibleContext.Provider>
  );
}

type PlainCollapsibleContentProps = { children: ReactNode };

function PlainCollapsibleContent({ children }: PlainCollapsibleContentProps) {
  const { open } = useContext(CollapsibleContext);
  if (!open) return null;
  return <>{children}</>;
}

function CollapsibleTriggerAsChild({
  children,
}: {
  children: ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}) {
  const { toggle } = useContext(CollapsibleContext);
  return cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      toggle();
    },
  });
}

// ── Inline stage card ───────────────────────────────────────────

type InlineStageCardProps = {
  stage: Stage;
  expanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  planStartDate: string | null;
  maxElevationM: number | null;
  stagePois: SnappedPlanPoi[];
};

export function InlineStageCard({
  stage,
  expanded,
  isActive,
  onToggle,
  planStartDate,
  maxElevationM,
  stagePois,
}: InlineStageCardProps) {
  const color = getStageColor(stage.dayNumber).stroke;
  const dateLine =
    planStartDate && planStartDate.trim().length > 0
      ? stageDayLabel(stage.dayNumber, planStartDate)
      : "";

  const hasExpandableBody =
    Boolean(stage.memo?.trim()) || stagePois.length > 0;

  return (
    <PlainCollapsible
      open={expanded}
      onOpenChange={(v) => {
        if (v !== expanded) onToggle();
      }}
    >
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card transition-shadow",
          "border-l-4",
          isActive ? "shadow-md" : "shadow-sm",
        )}
        style={{ borderLeftColor: color }}
      >
        <CollapsibleTriggerAsChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="shrink-0 border-0 px-2 py-0.5 text-[10px] text-white"
                  style={{ backgroundColor: color }}
                >
                  {stage.dayNumber}일
                </Badge>
                {dateLine ? (
                  <span className="text-[10px] text-muted-foreground">{dateLine}</span>
                ) : null}
                {isActive ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-orange-200 bg-orange-50 text-[10px] text-orange-600 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400"
                  >
                    현재 구간
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  {stage.distanceKm.toFixed(1)}km
                </span>
                <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-red-500 dark:text-red-400">
                  <ArrowUp className="size-3 shrink-0" aria-hidden />
                  {Math.round(stage.elevationGain).toLocaleString()}m
                </span>
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  <Mountain className="size-3 shrink-0" aria-hidden />
                  {maxElevationM != null ? `${maxElevationM.toLocaleString()}m` : "—"}
                </span>
              </div>
            </div>
            {hasExpandableBody || expanded ? (
              expanded ? (
                <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )
            ) : null}
          </button>
        </CollapsibleTriggerAsChild>

        <PlainCollapsibleContent>
          <div className="space-y-3 px-4 pb-4">
            {stage.memo?.trim() ? (
              <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                {stage.memo}
              </p>
            ) : null}
            {stagePois.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  경유 포인트
                </h4>
                <ul className="space-y-2">
                  {stagePois.map((poi) => (
                    <li key={poi.id} className="flex gap-2 text-xs">
                      <MapPin
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-foreground">{poi.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {poi.distanceKm.toFixed(1)}km · {poi.elevation}m
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {planPoiTypeLabelKo(poi.poiType)}
                          </span>
                        </div>
                        {poi.memo?.trim() ? (
                          <p className="mt-0.5 leading-snug text-muted-foreground">{poi.memo}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </PlainCollapsibleContent>
      </div>
    </PlainCollapsible>
  );
}

const SCROLL_ANCHOR_GAP_PX = 8;

export type StagesTabProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  stages: Stage[];
  trackPoints: TrackPoint[];
  planStartDate: string | null;
  planPois: PlanPoiRow[];
};

export function StagesTab({
  scrollRef,
  stages,
  trackPoints,
  planStartDate,
  planPois,
}: StagesTabProps) {
  const [elevProfileDay, setElevProfileDay] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const ratioByDayRef = useRef<Map<number, number>>(new Map());

  const snappedPois = useMemo(
    () => snapPlanPoisToTrack(planPois, trackPoints),
    [planPois, trackPoints],
  );

  const maxElevByDay = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const s of stages) {
      m.set(
        s.dayNumber,
        maxElevationInStageRange(
          trackPoints,
          s.startDistanceKm,
          s.endDistanceKm,
        ),
      );
    }
    return m;
  }, [stages, trackPoints]);

  const stickyOffset =
    MOBILE_PLAN_TAB_BAR_HEIGHT_PX + MOBILE_PLAN_ELEV_PANEL_HEIGHT_PX + SCROLL_ANCHOR_GAP_PX;

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || stages.length === 0) return;

    const ratioByDay = ratioByDayRef.current;
    ratioByDay.clear();

    const applyBestDay = () => {
      let bestDay: number | null = null;
      let bestRatio = 0;
      ratioByDay.forEach((ratio, day) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestDay = day;
        }
      });
      if (bestDay != null && bestRatio >= 0.25) setElevProfileDay(bestDay);
    };

    const observers: IntersectionObserver[] = [];

    const flush = () => {
      stages.forEach((stage) => {
        const el = cardRefs.current.get(stage.dayNumber);
        if (!el) return;
        const obs = new IntersectionObserver(
          (entries) => {
            for (const e of entries)
              ratioByDay.set(stage.dayNumber, e.intersectionRatio);
            applyBestDay();
          },
          {
            root: container,
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
            rootMargin: `-${stickyOffset}px 0px -35% 0px`,
          },
        );
        obs.observe(el);
        observers.push(obs);
      });
    };

    requestAnimationFrame(() => requestAnimationFrame(flush));

    return () => {
      observers.forEach((o) => o.disconnect());
      ratioByDay.clear();
    };
  }, [scrollRef, stages, stickyOffset]);

  const handleElevSelect = (day: number | null) => {
    setElevProfileDay(day);
    if (day == null) return;

    setExpandedDays((prev) => new Set(prev).add(day));

    const el = cardRefs.current.get(day);
    const container = scrollRef.current;
    if (!el || !container) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const target =
      container.scrollTop +
      (eRect.top - cRect.top) -
      (MOBILE_PLAN_TAB_BAR_HEIGHT_PX + MOBILE_PLAN_ELEV_PANEL_HEIGHT_PX + SCROLL_ANCHOR_GAP_PX);
    container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  };

  const toggleExpand = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  if (stages.length === 0) {
    return (
      <div className="p-4 pb-14">
        <p className="text-xs text-muted-foreground">등록된 일차가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="sticky z-40 border-b border-border bg-background/95 px-3 pb-2 pt-2 shadow-sm backdrop-blur-sm dark:bg-background/95"
        style={{ top: MOBILE_PLAN_TAB_BAR_HEIGHT_PX }}
      >
        <ElevationProfile
          trackPoints={trackPoints}
          stages={stages}
          selectedDayNumber={elevProfileDay}
          onSelectedDayChange={handleElevSelect}
          alwaysShowChips
          chartHeightPx={135}
          compactYAxis
          disablePinAndHoverScrub
          cpMarkers={[]}
          summitMarkers={[]}
        />
      </div>

      <div className="space-y-3 px-4 py-4 pb-14">
        {stages.map((stage) => (
          <div
            key={stage.id}
            ref={(el) => {
              if (el) cardRefs.current.set(stage.dayNumber, el);
              else cardRefs.current.delete(stage.dayNumber);
            }}
          >
            <InlineStageCard
              stage={stage}
              expanded={expandedDays.has(stage.dayNumber)}
              isActive={elevProfileDay === stage.dayNumber}
              onToggle={() => toggleExpand(stage.dayNumber)}
              planStartDate={planStartDate}
              maxElevationM={maxElevByDay.get(stage.dayNumber) ?? null}
              stagePois={poisForStage(snappedPois, stage)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
