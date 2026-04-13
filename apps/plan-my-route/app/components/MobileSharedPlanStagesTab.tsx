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
import { ArrowUp, ChevronDown, ChevronUp, MapPin, Mountain } from "lucide-react";
import { Badge, cn } from "@my-ridings/ui";
import type {
  CPOnRoute,
  SummitOnRoute,
  TrackPoint,
} from "./ElevationProfile";
import { ElevationProfile } from "./ElevationProfile";
import {
  calibrateThreshold,
  computeTrackElevationGainLoss,
} from "../hooks/usePlanStages";
import { stageDayLabel } from "./PlanStagesPane";
import type { Stage } from "../types/plan";
import { getStageColor } from "../types/plan";
import type { PlanPoiRow } from "../types/planPoi";
import type {
  StageScheduleMarkerKind,
  StageScheduleWaypoint,
} from "../types/stageScheduleWaypoint";
import { StageScheduleWaypointList } from "./StageScheduleWaypointList";
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

type DistanceAlongRoute = { distanceKm: number };

export function itemsInStage<T extends DistanceAlongRoute>(
  items: T[],
  stage: Stage,
): T[] {
  return items.filter(
    (p) =>
      p.distanceKm >= stage.startDistanceKm &&
      p.distanceKm <= stage.endDistanceKm,
  );
}

export function poisForStage(
  snapped: SnappedPlanPoi[],
  stage: Stage,
): SnappedPlanPoi[] {
  return itemsInStage(snapped, stage);
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

const CP_LABEL_KO = "체크포인트";
const SUMMIT_LABEL_KO = "정상";

export type { StageScheduleMarkerKind, StageScheduleWaypoint };

function waypointRowForAbsoluteKm(
  stage: Stage,
  trackPoints: TrackPoint[],
  absoluteKm: number,
  elevationM: number,
  calibratedThreshold: number,
  rest: {
    rowKey: string;
    name: string;
    categoryLabel: string;
    memo: string | null;
    markerKind: StageScheduleMarkerKind;
    planPoiType?: string;
    planPoiId?: string;
  },
): StageScheduleWaypoint {
  const distanceFromStageStartKm =
    Math.round(Math.max(0, absoluteKm - stage.startDistanceKm) * 100) / 100;
  const elevationGainFromStageStartM =
    trackPoints.length === 0
      ? 0
      : computeTrackElevationGainLoss(
          trackPoints,
          stage.startDistanceKm,
          absoluteKm,
          calibratedThreshold,
        ).gain;
  return {
    ...rest,
    distanceAlongRouteKm: absoluteKm,
    distanceFromStageStartKm,
    elevationM,
    elevationGainFromStageStartM,
  };
}

export function stageScheduleWaypoints(
  stage: Stage,
  snappedPois: SnappedPlanPoi[],
  cpMarkers: CPOnRoute[],
  summitMarkers: SummitOnRoute[],
  trackPoints: TrackPoint[],
  calibratedThreshold: number,
): StageScheduleWaypoint[] {
  const fromPois: StageScheduleWaypoint[] = itemsInStage(snappedPois, stage).map(
    (p) =>
      waypointRowForAbsoluteKm(
        stage,
        trackPoints,
        p.distanceKm,
        p.elevation,
        calibratedThreshold,
        {
          rowKey: `plan-poi:${p.id}`,
          name: p.name,
          categoryLabel: planPoiTypeLabelKo(p.poiType),
          memo: p.memo,
          markerKind: "plan_poi",
          planPoiType: p.poiType,
          planPoiId: p.id,
        },
      ),
  );
  const fromCp: StageScheduleWaypoint[] = itemsInStage(cpMarkers, stage).map(
    (c) =>
      waypointRowForAbsoluteKm(
        stage,
        trackPoints,
        c.distanceKm,
        Math.round(c.elevation),
        calibratedThreshold,
        {
          rowKey: `cp:${c.id}`,
          name: c.name,
          categoryLabel: CP_LABEL_KO,
          memo: null,
          markerKind: "cp",
        },
      ),
  );
  const fromSummit: StageScheduleWaypoint[] = itemsInStage(
    summitMarkers,
    stage,
  ).map((s) =>
    waypointRowForAbsoluteKm(
      stage,
      trackPoints,
      s.distanceKm,
      Math.round(s.elevation),
      calibratedThreshold,
      {
        rowKey: `summit:${s.id}`,
        name: s.name,
        categoryLabel: SUMMIT_LABEL_KO,
        memo: null,
        markerKind: "summit",
      },
    ),
  );
  return [...fromPois, ...fromCp, ...fromSummit].sort(
    (a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm,
  );
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
  stageWaypoints: StageScheduleWaypoint[];
};

export function InlineStageCard({
  stage,
  expanded,
  isActive,
  onToggle,
  planStartDate,
  maxElevationM,
  stageWaypoints,
}: InlineStageCardProps) {
  const color = getStageColor(stage.dayNumber).stroke;
  const dateLine =
    planStartDate && planStartDate.trim().length > 0
      ? stageDayLabel(stage.dayNumber, planStartDate)
      : "";

  const hasExpandableBody =
    Boolean(stage.memo?.trim()) || stageWaypoints.length > 0;

  const startLabel = stage.startName?.trim();
  const endLabel = stage.endName?.trim();
  const regionRouteLabel =
    startLabel && endLabel ? `${startLabel} -> ${endLabel}` : null;

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

              {regionRouteLabel ? (
                <p
                  className="mt-1 truncate text-xs text-muted-foreground"
                  title={regionRouteLabel}
                >
                  {regionRouteLabel}
                </p>
              ) : null}

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
            {stageWaypoints.length > 0 ? (
              <StageScheduleWaypointList rows={stageWaypoints} />
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
  /** RWGPS 등 전체 경로 획득고도 — calibrateThreshold에 사용 */
  knownRouteElevationGainM: number;
  planStartDate: string | null;
  planPois: PlanPoiRow[];
  cpMarkers?: CPOnRoute[];
  summitMarkers?: SummitOnRoute[];
};

export function StagesTab({
  scrollRef,
  stages,
  trackPoints,
  knownRouteElevationGainM,
  planStartDate,
  planPois,
  cpMarkers = [],
  summitMarkers = [],
}: StagesTabProps) {
  const [elevProfileDay, setElevProfileDay] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const ratioByDayRef = useRef<Map<number, number>>(new Map());

  const elevationCalibratedThreshold = useMemo(
    () => calibrateThreshold(trackPoints, knownRouteElevationGainM),
    [trackPoints, knownRouteElevationGainM],
  );

  const snappedPois = useMemo(
    () => snapPlanPoisToTrack(planPois, trackPoints),
    [planPois, trackPoints],
  );

  const waypointsByDay = useMemo(() => {
    const m = new Map<number, StageScheduleWaypoint[]>();
    for (const stage of stages) {
      m.set(
        stage.dayNumber,
        stageScheduleWaypoints(
          stage,
          snappedPois,
          cpMarkers,
          summitMarkers,
          trackPoints,
          elevationCalibratedThreshold,
        ),
      );
    }
    return m;
  }, [
    stages,
    snappedPois,
    cpMarkers,
    summitMarkers,
    trackPoints,
    elevationCalibratedThreshold,
  ]);

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
          elevationCalibratedThreshold={elevationCalibratedThreshold}
          selectedDayNumber={elevProfileDay}
          onSelectedDayChange={handleElevSelect}
          alwaysShowChips
          chartHeightPx={135}
          compactYAxis
          disablePinAndHoverScrub
          compactTooltip
          cpMarkers={cpMarkers}
          summitMarkers={summitMarkers}
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
              stageWaypoints={waypointsByDay.get(stage.dayNumber) ?? []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
