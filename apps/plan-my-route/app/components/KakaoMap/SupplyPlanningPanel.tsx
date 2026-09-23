"use client";

import { computeRouteDetour, type TrackPoint } from "@my-ridings/plan-geometry";
import { useEffect, useState } from "react";
import type { Stage } from "@/app/types/plan";
import type { PlanPoiRow } from "@/app/types/planPoi";
import {
  groupSupplyPlaces,
  type SupplyKind,
  type SupplyPlace,
  supplyElevationGainBetween,
  supplyElevationGainCurve,
  supplyGaps,
  supplyStageTrack,
} from "@/lib/supply-planning";

const KIND_LABELS: Record<SupplyKind, string> = {
  convenience: "편의점",
  hanaro: "하나로마트",
  mart: "기타 마트",
};
const KIND_COLORS: Record<SupplyKind, string> = {
  convenience: "#2563eb",
  hanaro: "#15803d",
  mart: "#a16207",
};

type Props = {
  routeId: string;
  stage: Stage;
  trackPoints: TrackPoint[];
  pois: PlanPoiRow[];
  onPlaces: (places: SupplyPlace[]) => void;
  onFocus: (place: SupplyPlace) => void;
  onAdd: (place: SupplyPlace) => void;
  onRange: (startKm: number, endKm: number) => void;
  onClose: () => void;
};

export function SupplyPlanningPanel({
  routeId,
  stage,
  trackPoints,
  pois,
  onPlaces,
  onFocus,
  onAdd,
  onRange,
  onClose,
}: Props) {
  const [detourM, setDetourM] = useState(1000);
  const [enabled, setEnabled] = useState<SupplyKind[]>(["convenience", "hanaro", "mart"]);
  const [places, setPlaces] = useState<SupplyPlace[]>([]);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    category: "편의점",
    done: false,
    truncated: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [gapRange, setGapRange] = useState<{ start: number; end: number } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is the explicit retry trigger.
  useEffect(() => {
    const controller = new AbortController();
    setPlaces([]);
    setError(null);
    setSelectedGroup(null);
    setGapRange(null);
    setProgress({ completed: 0, total: 0, category: "편의점", done: false, truncated: false });
    const search = async () => {
      const found = new Map<string, SupplyPlace>();
      let truncated = false;
      for (const [index, category] of ["convenience", "mart"].entries()) {
        let cursor: number | null = 0;
        while (cursor != null) {
          const params = new URLSearchParams({
            category,
            startKm: String(stage.startDistanceKm),
            endKm: String(stage.endDistanceKm),
            detourM: String(detourM),
            cursor: String(cursor),
          });
          const response = await fetch(`/api/routes/${routeId}/supply?${params}`, {
            signal: controller.signal,
          });
          const result: {
            documents: SupplyPlace[];
            completed: number;
            total: number;
            nextCursor: number | null;
            truncated: boolean;
            error?: string;
          } = await response.json();
          if (!response.ok) throw new Error(result.error ?? "검색에 실패했습니다.");
          if (controller.signal.aborted) return;
          for (const place of result.documents as SupplyPlace[]) {
            const previous = found.get(place.id);
            // 중복 검색된 하나로마트 분류는 유지한다.
            found.set(place.id, previous?.kind === "hanaro" ? previous : place);
          }
          truncated ||= result.truncated;
          setPlaces([...found.values()]);
          setProgress({
            completed: index * result.total + result.completed,
            total: result.total * 2,
            category: index === 0 ? "편의점" : "마트",
            done: index === 1 && result.nextCursor == null,
            truncated,
          });
          cursor = result.nextCursor;
        }
      }
    };
    void search().catch((reason) => {
      if (!controller.signal.aborted)
        setError(reason instanceof Error ? reason.message : "검색 실패");
    });
    return () => controller.abort();
  }, [routeId, stage.startDistanceKm, stage.endDistanceKm, detourM, attempt]);

  useEffect(() => {
    onPlaces(places.filter((place) => enabled.includes(place.kind)));
    return () => onPlaces([]);
  }, [places, enabled, onPlaces]);

  const visible = places.filter((place) => enabled.includes(place.kind));
  const groups = groupSupplyPlaces(visible);
  const registered = new Set(pois.map((poi) => poi.kakao_place_id).filter(Boolean));
  const stageTrack = supplyStageTrack(trackPoints, stage.startDistanceKm, stage.endDistanceKm);
  const gainCurve = supplyElevationGainCurve(
    trackPoints,
    stage.startDistanceKm,
    stage.endDistanceKm,
  );
  const stops = pois.flatMap((poi) => {
    if (
      !["convenience", "mart"].includes(poi.poi_type) ||
      poi.assignment_mode === "plan" ||
      (poi.assignment_mode === "stage" && poi.stage_id !== stage.id)
    )
      return [];
    const projection = computeRouteDetour(
      poi.assignment_mode === "stage" ? stageTrack : trackPoints,
      poi.lat,
      poi.lng,
    );
    if (projection?.routeDistanceM == null) return [];
    const km = projection.routeDistanceM / 1000;
    if (km < stage.startDistanceKm || km > stage.endDistanceKm) return [];
    return [{ name: poi.name, km }];
  });
  const gaps = supplyGaps(stops, stage.startDistanceKm, stage.endDistanceKm);
  const longest = [...gaps].sort((a, b) => b.distanceKm - a.distanceKm).slice(0, 3);
  const shownGroups = groups
    .filter((group) => selectedGroup == null || group.startM === selectedGroup)
    .filter(
      (group) =>
        !gapRange || (group.endM >= gapRange.start * 1000 && group.startM <= gapRange.end * 1000),
    );
  const kmLabel = (m: number) => (m / 1000 - stage.startDistanceKm).toFixed(1);
  const gainLabel = (fromM: number, toM: number) =>
    `+${supplyElevationGainBetween(gainCurve, fromM, toM).toLocaleString("ko-KR")}m`;
  const stageStartM = stage.startDistanceKm * 1000;

  return (
    <section
      aria-label="스테이지 보급 계획"
      className="absolute inset-x-0 bottom-0 z-20 flex h-[45%] flex-col overflow-y-auto border-t border-emerald-200 bg-white text-gray-900"
    >
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <strong className="text-sm">스테이지 {stage.dayNumber} · 보급 계획</strong>
        <span className="text-xs text-gray-600">
          {stage.distanceKm.toFixed(1)}km · +
          {Math.round(stage.elevationGain).toLocaleString("ko-KR")}m · 검색 {places.length}곳 · 등록{" "}
          {stops.length}곳
        </span>
        <button
          type="button"
          onClick={() => onRange(stage.startDistanceKm, stage.endDistanceKm)}
          className="text-xs text-blue-700 underline"
        >
          전체 경로 보기
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="보급 계획 닫기"
          className="ml-auto rounded px-2 py-1 hover:bg-gray-100"
        >
          닫기
        </button>
      </header>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
        {(Object.keys(KIND_LABELS) as SupplyKind[]).map((kind) => (
          <label
            key={kind}
            className="flex cursor-pointer items-center gap-1"
            style={{ color: KIND_COLORS[kind] }}
          >
            <input
              type="checkbox"
              checked={enabled.includes(kind)}
              onChange={() => {
                setSelectedGroup(null);
                setEnabled(
                  enabled.includes(kind) ? enabled.filter((k) => k !== kind) : [...enabled, kind],
                );
              }}
            />
            {KIND_LABELS[kind]} {places.filter((p) => p.kind === kind).length}
          </label>
        ))}
        <label className="flex items-center gap-1">
          경로 주변
          <select
            aria-label="보급소 검색 반경"
            value={detourM}
            onChange={(e) => setDetourM(Number(e.target.value))}
            className="rounded border p-1"
          >
            <option value={500}>500m</option>
            <option value={1000}>1km</option>
            <option value={3000}>3km</option>
          </select>
        </label>
        <span className="text-gray-500">
          이탈은 경로까지 직선거리 · 영업 여부는 장소 정보에서 확인
        </span>
      </div>
      <output className="block px-4 text-xs text-gray-600">
        {error ? (
          <span className="text-red-700">
            {error}{" "}
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="underline">
              다시 검색
            </button>
          </span>
        ) : progress.done ? (
          "전체 구간 검색 완료"
        ) : (
          `${progress.category} 검색 중 · ${progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}% — 아직 검색하지 않은 구간이 있습니다.`
        )}
        {progress.truncated && (
          <span className="ml-2 text-amber-700">
            검색 제공처의 결과 제한으로 일부 장소가 누락될 수 있습니다.
          </span>
        )}
        <span className="block">
          검색 결과가 없는 구간도 실제 무보급 구간을 의미하지는 않습니다.
        </span>
      </output>
      <section
        className="mx-4 my-2 flex shrink-0 gap-1 overflow-x-auto rounded-lg bg-gray-50 p-2"
        aria-label="거리순 보급 구간표"
      >
        <span className="self-center whitespace-nowrap text-xs">출발 0</span>
        {groups.map((group, i) => (
          <div key={group.startM} className="flex shrink-0 items-center gap-1">
            <span className="text-[11px] text-gray-500">
              —{" "}
              {(
                (group.startM - (groups[i - 1]?.endM ?? stage.startDistanceKm * 1000)) /
                1000
              ).toFixed(1)}
              km · {gainLabel(groups[i - 1]?.endM ?? stageStartM, group.startM)} —
            </span>
            <button
              type="button"
              aria-pressed={selectedGroup === group.startM}
              onClick={() => {
                setGapRange(null);
                setSelectedGroup(selectedGroup === group.startM ? null : group.startM);
                onRange(group.startM / 1000, group.endM / 1000 + 0.5);
              }}
              className={`rounded-lg border px-3 py-2 text-xs ${selectedGroup === group.startM ? "border-emerald-600 bg-emerald-50" : "border-gray-200 bg-white"}`}
            >
              <strong>
                {kmLabel(group.startM)}km · {group.places.length}곳
              </strong>
              <span className="block text-gray-500">
                {group.places.some((p) => p.kind === "hanaro")
                  ? "하나로마트 포함"
                  : group.places[0].place_name}
              </span>
            </button>
          </div>
        ))}
        <span className="shrink-0 self-center text-xs">
          —{" "}
          {(
            (stage.endDistanceKm * 1000 - (groups.at(-1)?.endM ?? stage.startDistanceKm * 1000)) /
            1000
          ).toFixed(1)}
          km · {gainLabel(groups.at(-1)?.endM ?? stageStartM, stage.endDistanceKm * 1000)} — 도착
        </span>
      </section>
      <div className="flex flex-wrap items-center gap-2 border-y px-4 py-2 text-xs">
        <strong>등록한 보급소 사이 긴 간격</strong>
        {longest.map((gap) => (
          <button
            type="button"
            key={`${gap.from.km}-${gap.to.km}`}
            onClick={() => {
              setSelectedGroup(null);
              setGapRange({ start: gap.from.km, end: gap.to.km });
              onRange(gap.from.km, gap.to.km);
            }}
            className="rounded bg-amber-50 px-2 py-1 text-amber-900 hover:bg-amber-100"
            title={`${gap.from.name} → ${gap.to.name}`}
          >
            {(gap.from.km - stage.startDistanceKm).toFixed(1)}–
            {(gap.to.km - stage.startDistanceKm).toFixed(1)}km · 간격 {gap.distanceKm.toFixed(1)}km
            · {gainLabel(gap.from.km * 1000, gap.to.km * 1000)}
          </button>
        ))}
        {(selectedGroup != null || gapRange) && (
          <button
            type="button"
            className="text-blue-700 underline"
            onClick={() => {
              setSelectedGroup(null);
              setGapRange(null);
            }}
          >
            전체 후보 표시
          </button>
        )}
      </div>
      <div className="min-h-0 overflow-y-auto px-4 py-2">
        {shownGroups.length === 0 && (
          <p className="py-3 text-sm text-gray-500">
            {progress.done
              ? "현재 필터에서 찾은 보급소가 없습니다. 검색 반경이나 필터를 바꿔보세요."
              : "검색 결과가 들어오면 거리순으로 표시됩니다."}
          </p>
        )}
        {shownGroups.map((group) => (
          <div key={group.startM} className="mb-3">
            <h3 className="mb-1 text-xs font-semibold text-gray-500">
              스테이지 {kmLabel(group.startM)}
              {group.endM > group.startM ? `–${kmLabel(group.endM)}` : ""}km · {group.places.length}
              곳
            </h3>
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
              {group.places.map((place) => (
                <article
                  key={place.id}
                  className="flex items-center gap-2 rounded-lg border p-2 text-xs"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left hover:text-blue-700"
                    onClick={() => onFocus(place)}
                  >
                    <span className="block font-semibold">
                      <span style={{ color: KIND_COLORS[place.kind] }}>
                        {KIND_LABELS[place.kind]}
                      </span>{" "}
                      · {place.place_name}
                    </span>
                    <span className="block text-gray-500">
                      {kmLabel(place.route_distance_m ?? 0)}km ·{" "}
                      {gainLabel(stageStartM, place.route_distance_m ?? stageStartM)} · 이탈{" "}
                      {Math.round(place.detour_m)}m
                    </span>
                    <span className="block truncate text-gray-500">{place.address_name}</span>
                  </button>
                  <button
                    type="button"
                    disabled={registered.has(place.id)}
                    onClick={() => onAdd(place)}
                    className="shrink-0 rounded bg-emerald-600 px-2 py-2 text-white disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {registered.has(place.id) ? "등록됨" : "POI 추가"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
