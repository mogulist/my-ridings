"use client";

import { Expand, Locate } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Stage } from "../../types/plan";
import { getStageColor, UNPLANNED_COLOR } from "../../types/plan";
import type { NearbyCategoryId } from "./nearbyCategoryId";
import { getNearbyCategoryMarkerImage } from "./nearbyCategoryMarkerImages";
import { nearbyCategoryIcon } from "./nearbyCategoryToolbarIcons";

export type ReviewState = "up2" | "up1" | "neutral" | "down";

export type PlaceReviewRow = {
  id: string;
  place_id: string;
  place_name: string;
  place_url: string | null;
  address_name: string | null;
  lat: number | null;
  lng: number | null;
  place_kind: string;
  review_state: ReviewState;
  note: string | null;
  route_id: string | null;
  plan_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewContext = {
  routeId: string;
  planId: string | null;
  stageId: string | null;
};

// ── RideWithGPS 타입 ──────────────────────────────────────────────
export interface TrackPoint {
  x: number; // 경도
  y: number; // 위도
  e?: number; // 고도
  d?: number; // 누적 거리
}

export interface PointOfInterest {
  id: number;
  name: string;
  lat: number;
  lng: number;
  poi_type_name: string;
}

export interface RideWithGPSRoute {
  id: number;
  name: string;
  distance: number;
  elevation_gain: number;
  elevation_loss: number;
  track_points: TrackPoint[];
  points_of_interest: PointOfInterest[];
}

// ── Kakao Maps 타입 ───────────────────────────────────────────────
declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsAPI;
    };
  }
}

interface KakaoMapsAPI {
  load: (callback: () => void) => void;
  Map: new (
    container: HTMLElement,
    options: { center: unknown; level: number },
  ) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new () => KakaoLatLngBounds;
  Polyline: new (options: {
    map: KakaoMapInstance;
    path: unknown[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
  }) => void;
  Marker: new (options: {
    map: KakaoMapInstance;
    position: unknown;
    title?: string;
    image?: unknown;
  }) => KakaoMarker;
  MarkerImage: new (
    src: string,
    size: unknown,
    options?: { offset?: unknown },
  ) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  InfoWindow: new (options: {
    content: string;
    removable?: boolean;
    zIndex?: number;
  }) => KakaoInfoWindow;
  CustomOverlay: new (options: {
    map: KakaoMapInstance;
    position: unknown;
    content: string;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }) => KakaoCustomOverlay;
  event: {
    addListener: (
      target: unknown,
      event: string,
      callback: (...args: unknown[]) => void,
    ) => void;
  };
}

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoMapInstance {
  setBounds: (bounds: unknown) => void;
  setCenter?: (latLng: unknown) => void;
  getCenter?: () => KakaoLatLng;
  setLevel?: (level: number) => void;
  getLevel?: () => number;
  getBounds?: () => {
    getSouthWest: () => KakaoLatLng;
    getNorthEast: () => KakaoLatLng;
  };
}

interface KakaoLatLngBounds {
  extend: (latlng: unknown) => void;
}

interface KakaoMarker {
  getPosition: () => unknown;
  setMap?: (map: unknown) => void;
  setZIndex?: (zIndex: number) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMapInstance, marker: KakaoMarker) => void;
  close: () => void;
  setContent?: (content: string) => void;
  setZIndex?: (zIndex: number) => void;
}

interface KakaoCustomOverlay {
  setMap: (map: unknown) => void;
  setPosition: (position: unknown) => void;
  setVisible: (visible: boolean) => void;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────
/** (lat, lng)에서 가장 가까운 track point 인덱스 반환 */
function findNearestIndexByLatLng(
  points: TrackPoint[],
  lat: number,
  lng: number,
): number {
  if (points.length === 0) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const d2 = (p.y - lat) ** 2 + (p.x - lng) ** 2;
    if (d2 < bestDist) {
      bestDist = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** track_points를 거리 기준으로 구간 분할 */
function slicePointsByDistance(
  points: TrackPoint[],
  startKm: number,
  endKm: number,
): TrackPoint[] {
  const startM = startKm * 1000;
  const endM = endKm * 1000;
  if (startM > endM) return [];

  const pointsWithDistance = points.filter(
    (point): point is TrackPoint & { d: number } => point.d != null,
  );
  if (pointsWithDistance.length === 0) return [];

  const stagePoints = pointsWithDistance.filter(
    (point) => point.d >= startM && point.d <= endM,
  );

  const startBoundary = interpolateBoundaryPoint(pointsWithDistance, startM);
  if (startBoundary && (stagePoints[0]?.d ?? Number.POSITIVE_INFINITY) > startM) {
    stagePoints.unshift(startBoundary);
  }

  const endBoundary = interpolateBoundaryPoint(pointsWithDistance, endM);
  if (
    endBoundary &&
    (stagePoints[stagePoints.length - 1]?.d ?? Number.NEGATIVE_INFINITY) < endM
  ) {
    stagePoints.push(endBoundary);
  }

  return stagePoints;
}

function interpolateBoundaryPoint(
  points: (TrackPoint & { d: number })[],
  targetDistanceM: number,
): (TrackPoint & { d: number }) | null {
  if (points.length === 0) return null;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (targetDistanceM <= firstPoint.d) return firstPoint;
  if (targetDistanceM >= lastPoint.d) return lastPoint;

  for (let index = 0; index < points.length - 1; index++) {
    const currentPoint = points[index];
    const nextPoint = points[index + 1];
    if (currentPoint.d === targetDistanceM) return currentPoint;
    if (nextPoint.d === targetDistanceM) return nextPoint;
    if (currentPoint.d > targetDistanceM || nextPoint.d < targetDistanceM) continue;

    const segmentDistance = nextPoint.d - currentPoint.d;
    if (segmentDistance <= 0) return currentPoint;

    const ratio = (targetDistanceM - currentPoint.d) / segmentDistance;
    return {
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * ratio,
      y: currentPoint.y + (nextPoint.y - currentPoint.y) * ratio,
      e:
        currentPoint.e != null && nextPoint.e != null
          ? currentPoint.e + (nextPoint.e - currentPoint.e) * ratio
          : undefined,
      d: targetDistanceM,
    };
  }

  return null;
}

function buildBufferedRouteRect(
  points: TrackPoint[] | undefined,
  bufferKm: number,
): string | null {
  if (!points?.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of points) {
    if (point.y < minLat) minLat = point.y;
    if (point.y > maxLat) maxLat = point.y;
    if (point.x < minLng) minLng = point.x;
    if (point.x > maxLng) maxLng = point.x;
  }
  if (minLat === Infinity) return null;

  const kmPerDegreeLat = 111.32;
  const midLat = (minLat + maxLat) / 2;
  const kmPerDegreeLng = Math.max(
    kmPerDegreeLat * Math.cos((midLat * Math.PI) / 180),
    0.000001,
  );

  const latPadding = bufferKm / kmPerDegreeLat;
  const lngPadding = bufferKm / kmPerDegreeLng;
  const swLng = minLng - lngPadding;
  const swLat = minLat - latPadding;
  const neLng = maxLng + lngPadding;
  const neLat = maxLat + latPadding;
  return `${swLng},${swLat},${neLng},${neLat}`;
}

type RectBounds = {
  swLng: number;
  swLat: number;
  neLng: number;
  neLat: number;
};

function toRectString(bounds: RectBounds): string {
  return `${bounds.swLng},${bounds.swLat},${bounds.neLng},${bounds.neLat}`;
}

// ── 숙박업소 타입 ──────────────────────────────────────────────────
type KakaoPlaceDoc = {
  id: string;
  place_name: string;
  place_url: string;
  address_name?: string;
  x: string;
  y: string;
};

type AccommodationCategory =
  | "motel"
  | "hotel"
  | "inn"
  | "pension"
  | "camping"
  | "other";

type AccommodationFilterState = Record<AccommodationCategory, boolean>;

type ClassifiedAccommodationDoc = KakaoPlaceDoc & {
  accommodationCategory: AccommodationCategory;
};

type AccommodationKeyword = {
  category: Exclude<AccommodationCategory, "other">;
  keyword: string;
};

type AccommodationCategoryOption = {
  category: AccommodationCategory;
  label: string;
};

const ACCOMMODATION_FILTER_STORAGE_KEY = "plan-my-route:accommodation-filter:v1";

const ACCOMMODATION_CATEGORY_OPTIONS: AccommodationCategoryOption[] = [
  { category: "motel", label: "모텔" },
  { category: "hotel", label: "호텔" },
  { category: "inn", label: "여관" },
  { category: "pension", label: "펜션" },
  { category: "camping", label: "캠핑" },
  { category: "other", label: "기타" },
];

const ACCOMMODATION_KEYWORDS: AccommodationKeyword[] = [
  { category: "motel", keyword: "모텔" },
  { category: "hotel", keyword: "호텔" },
  { category: "inn", keyword: "여관" },
  { category: "pension", keyword: "펜션" },
  { category: "camping", keyword: "캠핑장" },
  { category: "camping", keyword: "캠핑" },
  { category: "camping", keyword: "캠프" },
];

const DEFAULT_ACCOMMODATION_FILTERS: AccommodationFilterState = {
  motel: true,
  hotel: true,
  inn: true,
  pension: true,
  camping: true,
  other: true,
};

function classifyAccommodationCategory(
  placeName: string,
): AccommodationCategory {
  const normalizedName = placeName.toLowerCase();
  let bestMatch: { idx: number; category: AccommodationCategory } | null = null;
  for (const rule of ACCOMMODATION_KEYWORDS) {
    const idx = normalizedName.indexOf(rule.keyword);
    if (idx < 0) continue;
    if (!bestMatch || idx < bestMatch.idx) {
      bestMatch = { idx, category: rule.category };
    }
  }
  return bestMatch?.category ?? "other";
}

function classifyAccommodationDocuments(
  docs: KakaoPlaceDoc[],
): ClassifiedAccommodationDoc[] {
  return docs.map((doc) => ({
    ...doc,
    accommodationCategory: classifyAccommodationCategory(doc.place_name),
  }));
}

function buildAccommodationCategoryCounts(
  docs: ClassifiedAccommodationDoc[],
): Record<AccommodationCategory, number> {
  const counts: Record<AccommodationCategory, number> = {
    motel: 0,
    hotel: 0,
    inn: 0,
    pension: 0,
    camping: 0,
    other: 0,
  };
  for (const doc of docs) counts[doc.accommodationCategory] += 1;
  return counts;
}

function hasSelectedAccommodationCategory(
  filters: AccommodationFilterState,
): boolean {
  return Object.values(filters).some(Boolean);
}

function filterAccommodationDocuments(
  docs: ClassifiedAccommodationDoc[],
  filters: AccommodationFilterState,
): ClassifiedAccommodationDoc[] {
  if (!hasSelectedAccommodationCategory(filters)) return docs;
  return docs.filter((doc) => filters[doc.accommodationCategory]);
}

function parseAccommodationFiltersFromStorage(
  rawValue: string | null,
): AccommodationFilterState {
  if (!rawValue) return DEFAULT_ACCOMMODATION_FILTERS;
  try {
    const parsed = JSON.parse(rawValue) as Partial<AccommodationFilterState>;
    return {
      motel: parsed.motel ?? true,
      hotel: parsed.hotel ?? true,
      inn: parsed.inn ?? true,
      pension: parsed.pension ?? true,
      camping: parsed.camping ?? true,
      other: parsed.other ?? true,
    };
  } catch {
    return DEFAULT_ACCOMMODATION_FILTERS;
  }
}

type NearbyCategoryConfig = {
  id: NearbyCategoryId;
  label: string;
  categoryGroupCode: string;
  /** 있으면 카테고리 대신 키워드 검색(복수 쿼리 시 id 기준 병합) */
  keywordQueries?: string[];
  bookmarkPlaceKind: string;
  notePlaceholder: string;
};

function placeKindToCategory(kind: string): NearbyCategoryId {
  if (kind === "restaurant") return "restaurant";
  if (kind === "cafe") return "cafe";
  if (kind === "convenience") return "convenience";
  if (kind === "mart" || kind === "big_mart") return "mart";
  return "accommodation";
}

const NEARBY_CATEGORIES: NearbyCategoryConfig[] = [
  {
    id: "restaurant",
    label: "음식점",
    categoryGroupCode: "FD6",
    bookmarkPlaceKind: "restaurant",
    notePlaceholder: "메모",
  },
  {
    id: "cafe",
    label: "카페",
    categoryGroupCode: "CE7",
    bookmarkPlaceKind: "cafe",
    notePlaceholder: "메모",
  },
  {
    id: "convenience",
    label: "편의점",
    categoryGroupCode: "CS2",
    bookmarkPlaceKind: "convenience",
    notePlaceholder: "메모",
  },
  {
    id: "mart",
    label: "마트",
    categoryGroupCode: "",
    keywordQueries: ["마트"],
    bookmarkPlaceKind: "mart",
    notePlaceholder: "메모",
  },
  {
    id: "accommodation",
    label: "숙소",
    categoryGroupCode: "AD5",
    bookmarkPlaceKind: "accommodation",
    notePlaceholder: "숙박비, 소감 등",
  },
];

type NearbyDocsState = {
  restaurant: KakaoPlaceDoc[];
  cafe: KakaoPlaceDoc[];
  convenience: KakaoPlaceDoc[];
  mart: KakaoPlaceDoc[];
  accommodation: ClassifiedAccommodationDoc[];
};

const EMPTY_NEARBY_DOCS = (): NearbyDocsState => ({
  restaurant: [],
  cafe: [],
  convenience: [],
  mart: [],
  accommodation: [],
});

const REVIEW_STATE_COLORS: Record<ReviewState, string> = {
  up2: "#16a34a",
  up1: "#2563eb",
  neutral: "#6b7280",
  down: "#d1d5db",
};

function buildNaverMapUrls(
  placeName: string,
  addressName: string | undefined,
  lat: string,
  lng: string,
): { webUrl: string; appSchemeUrl: string } | null {
  const query = (placeName || addressName || "").trim();
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  const webUrl = `https://map.naver.com/p/search/${encoded}`;
  const appname =
    typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  const appSchemeUrl = `nmap://place?lat=${lat}&lng=${lng}&name=${encoded}&appname=${appname}`;
  return { webUrl, appSchemeUrl };
}

function buildAccommodationTooltipHtml(
  doc: KakaoPlaceDoc,
  review: PlaceReviewRow | null,
  tooltipMeta?: { placeKind: string; notePlaceholder: string },
): string {
  const placeKind = tooltipMeta?.placeKind ?? "accommodation";
  const notePlaceholder = tooltipMeta?.notePlaceholder ?? "숙박비, 소감 등";
  const badgeStyle =
    "display:inline-block;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;text-decoration:none;background:#f3f4f6;color:#1976d2;border:1px solid #e5e7eb;";
  const link = doc.place_url
    ? `<a href="${doc.place_url.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer" style="${badgeStyle}">카카오맵</a>`
    : "";
  const naverUrls = buildNaverMapUrls(
    doc.place_name,
    doc.address_name,
    doc.y,
    doc.x,
  );
  const naverLink =
    naverUrls &&
    `<a href="${naverUrls.webUrl.replace(/"/g, "&quot;")}" class="open-naver-map" target="_blank" rel="noopener noreferrer" data-naver-web-url="${naverUrls.webUrl.replace(/"/g, "&quot;")}" data-naver-app-url="${naverUrls.appSchemeUrl.replace(/"/g, "&quot;")}" style="${badgeStyle}">네이버맵</a>`;
  const state = review?.review_state ?? "neutral";
  const note = review?.note ?? "";
  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const linksBlock =
    link || naverLink
      ? `<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;">${link ?? ""}${naverLink ?? ""}</div>`
      : "";
  return `<div class="accommodation-tooltip" data-place-id="${esc(doc.id)}" data-place-name="${esc(doc.place_name)}" data-place-url="${esc(doc.place_url ?? "")}" data-address="${esc(doc.address_name ?? "")}" data-lat="${doc.y}" data-lng="${doc.x}" data-place-kind="${esc(placeKind)}" data-current-state="${state}" style="padding:12px 14px;min-width:200px;max-width:280px;line-height:1.45;color:#111827;">
  <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${esc(doc.place_name)}</div>
  ${linksBlock}
  <div style="margin-bottom:6px;font-size:11px;color:#6b7280;">평가</div>
  <div style="display:flex;gap:4px;margin-bottom:8px;">
    <button type="button" class="place-review-state-btn" data-state="up2" aria-label="확정" title="확정" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:${state === "up2" ? REVIEW_STATE_COLORS.up2 : "#fff"};color:${state === "up2" ? "#fff" : "#374151"};cursor:pointer;font-size:12px;">👍👍</button>
    <button type="button" class="place-review-state-btn" data-state="up1" aria-label="괜찮음" title="괜찮음" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:${state === "up1" ? REVIEW_STATE_COLORS.up1 : "#fff"};color:${state === "up1" ? "#fff" : "#374151"};cursor:pointer;font-size:12px;">👍</button>
    <button type="button" class="place-review-state-btn" data-state="neutral" aria-label="미평가" title="미평가" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:${state === "neutral" ? REVIEW_STATE_COLORS.neutral : "#fff"};color:${state === "neutral" ? "#fff" : "#374151"};cursor:pointer;font-size:12px;">○</button>
    <button type="button" class="place-review-state-btn" data-state="down" aria-label="제외" title="제외" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:${state === "down" ? REVIEW_STATE_COLORS.down : "#fff"};color:${state === "down" ? "#fff" : "#374151"};cursor:pointer;font-size:12px;">👎</button>
  </div>
  <div style="margin-bottom:4px;font-size:11px;color:#6b7280;">메모</div>
  <textarea class="place-review-note" rows="2" placeholder="${esc(notePlaceholder)}" style="width:100%;padding:6px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;resize:vertical;box-sizing:border-box;">${esc(note)}</textarea>
  <button type="button" class="place-review-save" style="margin-top:8px;padding:6px 12px;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">저장</button>
</div>`;
}

type PlaceReviewCloseSnap = {
  el: HTMLElement;
  pointerEvents: string;
  opacity: string;
};

function findKakaoInfoWindowCloseButton(tooltipRoot: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = tooltipRoot.parentElement;
  for (let i = 0; i < 16 && node; i++) {
    const anchors = node.querySelectorAll("a");
    for (const a of anchors) {
      if (!(a instanceof HTMLElement)) continue;
      if (tooltipRoot.contains(a)) continue;
      const cls = a.className;
      if (typeof cls === "string" && cls.split(/\s+/).includes("close")) return a;
      if (a.title === "닫기") return a;
    }
    node = node.parentElement;
  }
  return null;
}

function lockPlaceReviewTooltip(root: HTMLElement): PlaceReviewCloseSnap | null {
  root.dataset.saving = "true";
  root.querySelectorAll(".place-review-state-btn").forEach((btn) => {
    (btn as HTMLButtonElement).disabled = true;
  });
  const note = root.querySelector(".place-review-note") as HTMLTextAreaElement | null;
  if (note) note.disabled = true;
  const saveBtn = root.querySelector(".place-review-save") as HTMLButtonElement | null;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML =
      '<span class="place-review-save-spinner" aria-hidden="true"></span><span>저장 중…</span>';
  }
  const closeEl = findKakaoInfoWindowCloseButton(root);
  if (!closeEl) return null;
  const snap: PlaceReviewCloseSnap = {
    el: closeEl,
    pointerEvents: closeEl.style.pointerEvents,
    opacity: closeEl.style.opacity,
  };
  closeEl.style.pointerEvents = "none";
  closeEl.style.opacity = "0.35";
  closeEl.setAttribute("aria-disabled", "true");
  return snap;
}

function unlockPlaceReviewTooltip(
  root: HTMLElement,
  closeSnap: PlaceReviewCloseSnap | null,
): void {
  if (closeSnap?.el.isConnected) {
    closeSnap.el.style.pointerEvents = closeSnap.pointerEvents;
    closeSnap.el.style.opacity = closeSnap.opacity;
    closeSnap.el.removeAttribute("aria-disabled");
  }
  if (!root.isConnected) return;
  delete root.dataset.saving;
  root.querySelectorAll(".place-review-state-btn").forEach((btn) => {
    (btn as HTMLButtonElement).disabled = false;
  });
  const noteEl = root.querySelector(".place-review-note") as HTMLTextAreaElement | null;
  if (noteEl) noteEl.disabled = false;
  const saveBtn = root.querySelector(".place-review-save") as HTMLButtonElement | null;
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.textContent = "저장";
  }
}

// ── Props ─────────────────────────────────────────────────────────
const HIGHLIGHT_MARKER_SIZE = 16;
const HIGHLIGHT_MARKER_COLOR = "#f97316";
/** 하이라이트 CustomOverlay(zIndex 10) 위에 두어 클릭이 장소 마커로 가도록 함 */
const PLACE_MARKER_Z_INDEX = 50;
/** 마커·하이라이트보다 위에 인포윈도우(툴팁)가 오도록 함 */
const INFO_WINDOW_Z_INDEX = 100;
const ZOOM_LIMIT_ACCOMMODATION = 7;
const NEARBY_SEARCH_BUFFER_KM = 2;

function highlightCircleMarkerHtml(size: number, clickable: boolean): string {
  const cursor = clickable ? "cursor:pointer;" : "";
  return `<div class="highlight-marker-circle" style="width:${size}px;height:${size}px;border-radius:50%;background:${HIGHLIGHT_MARKER_COLOR};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);${cursor}"></div>`;
}

interface KakaoMapProps {
  route?: RideWithGPSRoute | null;
  stages?: Stage[];
  activeStageId?: string | null;
  onStageHover?: (id: string | null) => void;
  /** [lat, lng] 고도 프로필 연동 마커 위치 */
  highlightPosition?: [number, number] | null;
  /** 지도 mousemove 시 가장 가까운 포인트 인덱스 콜백 */
  onPositionChange?: (index: number | null) => void;
  trackPoints?: TrackPoint[];
  isPinned?: boolean;
  onPin?: (index: number) => void;
  onUnpin?: () => void;
  autoCenterOnPin?: boolean;
  /** route/plan/stage context for saving place reviews */
  reviewContext?: ReviewContext;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
const ZOOM_LEVEL_ON_MARKER = 7;
const NEARBY_CACHE_TTL_MS = 10 * 60 * 1000;
const NEARBY_CATEGORY_IDS: NearbyCategoryId[] = [
  "restaurant",
  "cafe",
  "convenience",
  "mart",
  "accommodation",
];

type NearbyCategoryCacheMeta = {
  fetchedAt: number | null;
  isInvalidated: boolean;
};

type NearbyCacheMetaState = Record<NearbyCategoryId, NearbyCategoryCacheMeta>;

const EMPTY_NEARBY_CACHE_META = (): NearbyCacheMetaState => ({
  restaurant: { fetchedAt: null, isInvalidated: true },
  cafe: { fetchedAt: null, isInvalidated: true },
  convenience: { fetchedAt: null, isInvalidated: true },
  mart: { fetchedAt: null, isInvalidated: true },
  accommodation: { fetchedAt: null, isInvalidated: true },
});

export default function KakaoMap({
  route,
  stages = [],
  activeStageId,
  highlightPosition = null,
  onPositionChange,
  trackPoints = [],
  isPinned = false,
  onPin,
  onUnpin,
  autoCenterOnPin = false,
  reviewContext = { routeId: "", planId: null, stageId: null },
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const openInfoWindowRef = useRef<KakaoInfoWindow | null>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const lastRouteIdRef = useRef<number | null>(null);
  const highlightOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const isPinnedRef = useRef(isPinned);
  const onPinRef = useRef(onPin);
  const onUnpinRef = useRef(onUnpin);
  const reviewContextRef = useRef(reviewContext);
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number | null>(null);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState<NearbyCategoryId | null>(
    null,
  );
  const [activeCategory, setActiveCategory] =
    useState<NearbyCategoryId>("accommodation");
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const [accommodationFilters, setAccommodationFilters] =
    useState<AccommodationFilterState>(DEFAULT_ACCOMMODATION_FILTERS);
  const [nearbyDocs, setNearbyDocs] = useState<NearbyDocsState>(EMPTY_NEARBY_DOCS);
  const [nearbyCacheMeta, setNearbyCacheMeta] = useState<NearbyCacheMetaState>(
    EMPTY_NEARBY_CACHE_META,
  );
  const [placeReviewsMap, setPlaceReviewsMap] = useState<
    Record<string, PlaceReviewRow>
  >({});
  const searchPopoverRef = useRef<HTMLDivElement | null>(null);
  const accommodationOverlaysRef = useRef<KakaoMarker[]>([]);
  const starredMarkersRef = useRef<KakaoMarker[]>([]);
  const onReviewChangeRef = useRef<
    ((placeId: string, review: PlaceReviewRow) => void) | null
  >(null);
  const activePlaceInfoRef = useRef<{
    doc: KakaoPlaceDoc;
    infoWindow: KakaoInfoWindow;
    tooltipMeta: { placeKind: string; notePlaceholder: string };
  } | null>(null);
  const placeReviewSavingRef = useRef(false);
  const afterRouteDrawRef = useRef<
    ((map: KakaoMapInstance, maps: KakaoMapsAPI) => void) | null
  >(null);

  reviewContextRef.current = reviewContext;

  onPositionChangeRef.current = onPositionChange;
  isPinnedRef.current = isPinned;
  onPinRef.current = onPin;
  onUnpinRef.current = onUnpin;

  const invalidateAllNearbyCache = useCallback(() => {
    setNearbyCacheMeta((prev) => {
      let shouldUpdate = false;
      const next = { ...prev };
      for (const categoryId of NEARBY_CATEGORY_IDS) {
        const currentMeta = prev[categoryId];
        if (currentMeta.isInvalidated) continue;
        shouldUpdate = true;
        next[categoryId] = { ...currentMeta, isInvalidated: true };
      }
      return shouldUpdate ? next : prev;
    });
  }, []);

  const drawRoute = useCallback(
    (kakaoMaps: KakaoMapsAPI, routeData: RideWithGPSRoute) => {
      if (!containerRef.current) return;

      const points = routeData.track_points;
      const firstPoint = points[0];
      const previousMap = mapInstanceRef.current as KakaoMapInstance | null;
      const isSameRouteRerender = lastRouteIdRef.current === routeData.id;
      const previousCenter = previousMap?.getCenter?.();
      const previousLevel = previousMap?.getLevel?.();
      const shouldPreserveViewport =
        isSameRouteRerender &&
        previousCenter != null &&
        typeof previousLevel === "number";

      const map = new kakaoMaps.Map(containerRef.current, {
        center:
          shouldPreserveViewport && previousCenter
            ? new kakaoMaps.LatLng(previousCenter.getLat(), previousCenter.getLng())
            : new kakaoMaps.LatLng(firstPoint.y, firstPoint.x),
        level: shouldPreserveViewport && previousLevel ? previousLevel : 12,
      });

      // Stage가 없는 경우: 기존처럼 단일 Polyline
      if (stages.length === 0) {
        const path = points.map((p) => new kakaoMaps.LatLng(p.y, p.x));
        new kakaoMaps.Polyline({
          map,
          path,
          strokeWeight: 4,
          strokeColor: "#FF4500",
          strokeOpacity: 0.85,
          strokeStyle: "solid",
        });

        if (!shouldPreserveViewport) {
          const bounds = new kakaoMaps.LatLngBounds();
          for (const latlng of path) bounds.extend(latlng);
          map.setBounds(bounds);
        }
      } else {
        const totalDistanceKm = routeData.distance / 1000;

        // Stage별 Polyline
        for (const stage of stages) {
          const stagePoints = slicePointsByDistance(
            points,
            stage.startDistanceKm,
            stage.endDistanceKm,
          );
          if (stagePoints.length < 2) continue;

          const color = getStageColor(stage.dayNumber);
          const isActive = stage.id === activeStageId;

          const path = stagePoints.map((p) => new kakaoMaps.LatLng(p.y, p.x));
          new kakaoMaps.Polyline({
            map,
            path,
            strokeWeight: isActive ? 6 : 4,
            strokeColor: color.stroke,
            strokeOpacity: isActive ? 1 : 0.8,
            strokeStyle: "solid",
          });

          // Stage 시작점 마커 (숫자 오버레이)
          const startPt = stagePoints[0];
          const content = `<div style="
						display:flex;align-items:center;justify-content:center;
						width:24px;height:24px;border-radius:50%;
						background:${color.stroke};color:white;
						font-size:12px;font-weight:700;
						border:2px solid white;
						box-shadow:0 2px 4px rgba(0,0,0,0.3);
					">${stage.dayNumber}</div>`;

          new kakaoMaps.CustomOverlay({
            map,
            position: new kakaoMaps.LatLng(startPt.y, startPt.x),
            content,
            yAnchor: 1.3,
            xAnchor: 0.5,
          });
        }

        // 미계획 구간 (마지막 Stage 끝 ~ 전체 끝)
        const lastStage = stages[stages.length - 1];
        if (lastStage.endDistanceKm < totalDistanceKm - 0.1) {
          const unplannedPoints = slicePointsByDistance(
            points,
            lastStage.endDistanceKm,
            totalDistanceKm,
          );
          if (unplannedPoints.length >= 2) {
            const path = unplannedPoints.map(
              (p) => new kakaoMaps.LatLng(p.y, p.x),
            );
            new kakaoMaps.Polyline({
              map,
              path,
              strokeWeight: 3,
              strokeColor: UNPLANNED_COLOR.stroke,
              strokeOpacity: 0.5,
              strokeStyle: "shortdash",
            });
          }
        }

        // 전체 경로 bounds
        if (!shouldPreserveViewport) {
          const allPath = points.map((p) => new kakaoMaps.LatLng(p.y, p.x));
          const bounds = new kakaoMaps.LatLngBounds();
          for (const latlng of allPath) bounds.extend(latlng);
          map.setBounds(bounds);
        }
      }

      // CP 마커
      for (const poi of routeData.points_of_interest) {
        const pos = new kakaoMaps.LatLng(poi.lat, poi.lng);
        const marker = new kakaoMaps.Marker({
          map,
          position: pos,
          title: poi.name,
        });
        marker.setZIndex?.(PLACE_MARKER_Z_INDEX);

        const infoContent = `
					<div style="
						padding:8px 12px;font-size:13px;font-weight:600;color:#1a1a1a;
						background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);
						max-width:180px;line-height:1.4;
					">📍 ${poi.name}</div>`;
        const infoWindow = new kakaoMaps.InfoWindow({
          content: infoContent,
          removable: true,
          zIndex: INFO_WINDOW_Z_INDEX,
        });

        kakaoMaps.event.addListener(marker, "click", () => {
          if (openInfoWindowRef.current) openInfoWindowRef.current.close();
          infoWindow.open(map, marker);
          infoWindow.setZIndex?.(INFO_WINDOW_Z_INDEX);
          openInfoWindowRef.current = infoWindow;
        });
      }

      // START / FINISH 마커
      const firstPos = new kakaoMaps.LatLng(firstPoint.y, firstPoint.x);
      const lastPoint = points[points.length - 1];
      const lastPos = new kakaoMaps.LatLng(lastPoint.y, lastPoint.x);
      const startMarker = new kakaoMaps.Marker({
        map,
        position: firstPos,
        title: "START",
      });
      startMarker.setZIndex?.(PLACE_MARKER_Z_INDEX);
      const finishMarker = new kakaoMaps.Marker({
        map,
        position: lastPos,
        title: "FINISH",
      });
      finishMarker.setZIndex?.(PLACE_MARKER_Z_INDEX);

      mapInstanceRef.current = map;
      lastRouteIdRef.current = routeData.id;
      setMapReady(true);
      afterRouteDrawRef.current?.(map, kakaoMaps);

      // 지도 mousemove → 고도 프로필 마커 연동 (isPinned 시에는 갱신하지 않음)
      if (points.length > 0) {
        const cb = (e?: unknown) => {
          if (isPinnedRef.current) return;
          const ev = e as
            | { latLng?: { getLat: () => number; getLng: () => number } }
            | undefined;
          if (!ev?.latLng) return;
          const lat = ev.latLng.getLat();
          const lng = ev.latLng.getLng();
          const idx = findNearestIndexByLatLng(points, lat, lng);
          onPositionChangeRef.current?.(idx);
        };
        kakaoMaps.event.addListener(map, "mousemove", cb);
      }

      // 지도 클릭 → 마커 고정
      if (points.length > 0 && onPinRef.current) {
        const clickCb = (e?: unknown) => {
          const ev = e as
            | { latLng?: { getLat: () => number; getLng: () => number } }
            | undefined;
          if (!ev?.latLng) return;
          const lat = ev.latLng.getLat();
          const lng = ev.latLng.getLng();
          const idx = findNearestIndexByLatLng(points, lat, lng);
          onPinRef.current?.(idx);
        };
        kakaoMaps.event.addListener(map, "click", clickCb);
      }

      // 줌 레벨 구독
      const mapWithLevel = map as { getLevel?: () => number };
      if (mapWithLevel.getLevel) {
        setZoomLevel(mapWithLevel.getLevel());
        kakaoMaps.event.addListener(map, "zoom_changed", () => {
          if (mapWithLevel.getLevel) setZoomLevel(mapWithLevel.getLevel());
        });
      }
      kakaoMaps.event.addListener(map, "idle", () => {
        invalidateAllNearbyCache();
      });
    },
    [stages, activeStageId, invalidateAllNearbyCache],
  );

  const handleScriptLoad = useCallback(() => {
    if (!window.kakao?.maps?.load || !route) return;
    window.kakao.maps.load(() => {
      if (!window.kakao?.maps) return;
      drawRoute(window.kakao.maps, route);
    });
  }, [drawRoute, route]);

  const containerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      if (!node || !route) return;
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (!window.kakao?.maps) return;
          drawRoute(window.kakao.maps, route);
        });
      }
    },
    [drawRoute, route],
  );

  const fetchPlaceReviews = useCallback(async (): Promise<
    Record<string, PlaceReviewRow>
  > => {
    const res = await fetch("/api/bookmarks");
    if (!res.ok) return {};
    const data = (await res.json()) as PlaceReviewRow[];
    const map: Record<string, PlaceReviewRow> = {};
    for (const row of data) map[row.place_id] = row;
    setPlaceReviewsMap(map);
    return map;
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    void fetchPlaceReviews();
  }, [mapReady, fetchPlaceReviews]);

  const clearAccommodationMarkers = useCallback(() => {
    accommodationOverlaysRef.current.forEach((marker) => marker.setMap?.(null));
    accommodationOverlaysRef.current = [];
  }, []);

  const clearStarredMarkers = useCallback(() => {
    starredMarkersRef.current.forEach((marker) => marker.setMap?.(null));
    starredMarkersRef.current = [];
  }, []);

  const renderStarredMarkers = useCallback(
    (
      map: KakaoMapInstance,
      maps: KakaoMapsAPI,
      items: {
        doc: KakaoPlaceDoc;
        categoryId: NearbyCategoryId;
        review: PlaceReviewRow;
      }[],
    ) => {
      clearStarredMarkers();
      const nextMarkers: KakaoMarker[] = [];
      for (const { doc, categoryId, review } of items) {
        const state = review.review_state as ReviewState;
        const cfg = NEARBY_CATEGORIES.find((c) => c.id === categoryId);
        const tooltipMeta = cfg
          ? { placeKind: cfg.bookmarkPlaceKind, notePlaceholder: cfg.notePlaceholder }
          : { placeKind: "accommodation", notePlaceholder: "숙박비, 소감 등" };
        const marker = new maps.Marker({
          map: map as never,
          position: new maps.LatLng(Number(doc.y), Number(doc.x)),
          title: doc.place_name,
          image: getNearbyCategoryMarkerImage(
            maps,
            REVIEW_STATE_COLORS[state],
            categoryId,
          ),
        });
        marker.setZIndex?.(PLACE_MARKER_Z_INDEX);
        nextMarkers.push(marker);

        const infoWindow = new maps.InfoWindow({
          content: buildAccommodationTooltipHtml(doc, review, tooltipMeta),
          removable: true,
          zIndex: INFO_WINDOW_Z_INDEX,
        });

        maps.event.addListener(marker, "click", () => {
          if (openInfoWindowRef.current) openInfoWindowRef.current.close();
          infoWindow.setContent?.(
            buildAccommodationTooltipHtml(doc, review, tooltipMeta),
          );
          infoWindow.open(map, marker);
          infoWindow.setZIndex?.(INFO_WINDOW_Z_INDEX);
          openInfoWindowRef.current = infoWindow;
          activePlaceInfoRef.current = { doc, infoWindow, tooltipMeta };
        });
      }
      starredMarkersRef.current = nextMarkers;
    },
    [clearStarredMarkers],
  );

  const renderNearbyMarkers = useCallback(
    (
      map: KakaoMapInstance,
      maps: KakaoMapsAPI,
      categoryId: NearbyCategoryId,
      docs: (KakaoPlaceDoc | ClassifiedAccommodationDoc)[],
      reviewsMap: Record<string, PlaceReviewRow>,
    ) => {
      const cfg = NEARBY_CATEGORIES.find((c) => c.id === categoryId);
      const tooltipMeta = cfg
        ? { placeKind: cfg.bookmarkPlaceKind, notePlaceholder: cfg.notePlaceholder }
        : { placeKind: "accommodation", notePlaceholder: "숙박비, 소감 등" };
      if (openInfoWindowRef.current) {
        openInfoWindowRef.current.close();
        openInfoWindowRef.current = null;
      }
      clearAccommodationMarkers();
      const nextMarkers: KakaoMarker[] = [];
      for (const doc of docs) {
        const state = (reviewsMap[doc.id]?.review_state ?? "neutral") as ReviewState;
        const marker = new maps.Marker({
          map: map as never,
          position: new maps.LatLng(Number(doc.y), Number(doc.x)),
          title: doc.place_name,
          image: getNearbyCategoryMarkerImage(
            maps,
            REVIEW_STATE_COLORS[state],
            categoryId,
          ),
        });
        marker.setZIndex?.(PLACE_MARKER_Z_INDEX);
        nextMarkers.push(marker);

        const infoWindow = new maps.InfoWindow({
          content: buildAccommodationTooltipHtml(
            doc,
            reviewsMap[doc.id] ?? null,
            tooltipMeta,
          ),
          removable: true,
          zIndex: INFO_WINDOW_Z_INDEX,
        });

        maps.event.addListener(marker, "click", () => {
          if (openInfoWindowRef.current) openInfoWindowRef.current.close();
          infoWindow.setContent?.(
            buildAccommodationTooltipHtml(
              doc,
              reviewsMap[doc.id] ?? null,
              tooltipMeta,
            ),
          );
          infoWindow.open(map, marker);
          infoWindow.setZIndex?.(INFO_WINDOW_Z_INDEX);
          openInfoWindowRef.current = infoWindow;
          activePlaceInfoRef.current = { doc, infoWindow, tooltipMeta };
        });
      }
      accommodationOverlaysRef.current = nextMarkers;
    },
    [clearAccommodationMarkers],
  );

  const accommodationCategoryCounts = useMemo(
    () => buildAccommodationCategoryCounts(nearbyDocs.accommodation),
    [nearbyDocs.accommodation],
  );

  const starredDocs = useMemo(() => {
    const docs: {
      doc: KakaoPlaceDoc;
      categoryId: NearbyCategoryId;
      review: PlaceReviewRow;
    }[] = [];
    for (const review of Object.values(placeReviewsMap)) {
      if (review.review_state !== "up1" && review.review_state !== "up2")
        continue;
      if (review.lat == null || review.lng == null) continue;
      const categoryId = placeKindToCategory(review.place_kind);
      const doc: KakaoPlaceDoc = {
        id: review.place_id,
        place_name: review.place_name,
        place_url: review.place_url ?? "",
        address_name: review.address_name ?? "",
        x: String(review.lng),
        y: String(review.lat),
      };
      docs.push({ doc, categoryId, review });
    }
    return docs;
  }, [placeReviewsMap]);

  const isNearbyCacheUsable = useCallback(
    (categoryId: NearbyCategoryId) => {
      const cacheMeta = nearbyCacheMeta[categoryId];
      if (cacheMeta.isInvalidated || cacheMeta.fetchedAt == null) return false;
      return Date.now() - cacheMeta.fetchedAt <= NEARBY_CACHE_TTL_MS;
    },
    [nearbyCacheMeta],
  );

  const handleReloadNearby = useCallback(
    async (categoryId: NearbyCategoryId) => {
      const map = mapInstanceRef.current as KakaoMapInstance | null;
      if (!map) return;

      const bounds = map.getBounds?.();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const viewportRectBounds: RectBounds = {
        swLng: sw.getLng(),
        swLat: sw.getLat(),
        neLng: ne.getLng(),
        neLat: ne.getLat(),
      };
      const visibleRoutePoints = (route?.track_points ?? []).filter((point) => (
        point.x >= viewportRectBounds.swLng &&
        point.x <= viewportRectBounds.neLng &&
        point.y >= viewportRectBounds.swLat &&
        point.y <= viewportRectBounds.neLat
      ));
      const routeRect = buildBufferedRouteRect(
        visibleRoutePoints,
        NEARBY_SEARCH_BUFFER_KM,
      );
      const rect = routeRect ?? toRectString(viewportRectBounds);
      const cfg = NEARBY_CATEGORIES.find((c) => c.id === categoryId);

      setLoadingCategory(categoryId);
      try {
        if (cfg?.keywordQueries?.length) {
          const seen = new Set<string>();
          const merged: KakaoPlaceDoc[] = [];
          for (const q of cfg.keywordQueries) {
            const res = await fetch(
              `/api/kakao/local/keyword?rect=${encodeURIComponent(rect)}&query=${encodeURIComponent(q)}`,
            );
            if (!res.ok) throw new Error("Failed to fetch");
            const { documents } = (await res.json()) as {
              documents: KakaoPlaceDoc[];
            };
            for (const d of documents) {
              if (seen.has(d.id)) continue;
              seen.add(d.id);
              merged.push({
                id: d.id,
                place_name: d.place_name,
                place_url: d.place_url ?? "",
                address_name: d.address_name,
                x: d.x,
                y: d.y,
              });
            }
          }
          setNearbyDocs((prev) => ({ ...prev, [categoryId]: merged }));
        } else {
          const code = cfg?.categoryGroupCode ?? "AD5";
          const res = await fetch(
            `/api/kakao/local/category?rect=${encodeURIComponent(rect)}&category_group_code=${encodeURIComponent(code)}`,
          );
          if (!res.ok) throw new Error("Failed to fetch");
          const { documents } = (await res.json()) as { documents: KakaoPlaceDoc[] };
          if (categoryId === "accommodation") {
            setNearbyDocs((prev) => ({
              ...prev,
              accommodation: classifyAccommodationDocuments(documents),
            }));
          } else {
            setNearbyDocs((prev) => ({ ...prev, [categoryId]: documents }));
          }
        }
        setNearbyCacheMeta((prev) => ({
          ...prev,
          [categoryId]: { fetchedAt: Date.now(), isInvalidated: false },
        }));
        await fetchPlaceReviews();
        setShowNearbyPlaces(true);
      } catch {
        if (categoryId === "accommodation") {
          setNearbyDocs((prev) => ({ ...prev, accommodation: [] }));
        } else {
          setNearbyDocs((prev) => ({ ...prev, [categoryId]: [] }));
        }
        setNearbyCacheMeta((prev) => ({
          ...prev,
          [categoryId]: { fetchedAt: null, isInvalidated: true },
        }));
      } finally {
        setLoadingCategory(null);
      }
    },
    [fetchPlaceReviews, route?.track_points],
  );

  const handleNearbyVisibilityToggle = useCallback(() => {
    if (showNearbyPlaces) {
      clearAccommodationMarkers();
      setShowNearbyPlaces(false);
      return;
    }
    setShowNearbyPlaces(true);
  }, [showNearbyPlaces, clearAccommodationMarkers]);

  onReviewChangeRef.current = (placeId: string, review: PlaceReviewRow) => {
    setPlaceReviewsMap((prev) => ({ ...prev, [placeId]: review }));
    const activeInfo = activePlaceInfoRef.current;
    if (activeInfo && activeInfo.doc.id === placeId) {
      activeInfo.infoWindow.setContent?.(
        buildAccommodationTooltipHtml(
          activeInfo.doc,
          review,
          activeInfo.tooltipMeta,
        ),
      );
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const naverMapLink = (e.target as HTMLElement).closest("a.open-naver-map");
      if (naverMapLink) {
        e.preventDefault();
        const webUrl = (naverMapLink as HTMLAnchorElement).dataset.naverWebUrl;
        const appUrl = (naverMapLink as HTMLAnchorElement).dataset.naverAppUrl;
        if (appUrl) {
          window.location.href = appUrl;
          setTimeout(() => {
            if (!document.hidden) window.open(webUrl ?? "", "_blank", "noopener,noreferrer");
          }, 1500);
        } else if (webUrl) {
          window.open(webUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }

      const stateBtn = (e.target as HTMLElement).closest(".place-review-state-btn");
      if (stateBtn) {
        e.preventDefault();
        const root = (e.target as HTMLElement).closest(".accommodation-tooltip");
        if (!root) return;
        if ((root as HTMLElement).dataset.saving === "true") return;
        const state = (stateBtn as HTMLButtonElement).dataset.state as ReviewState;
        (root as HTMLElement).dataset.currentState = state;
        const activeInfo = activePlaceInfoRef.current;
        if (activeInfo) {
          const noteEl = root.querySelector(".place-review-note") as HTMLTextAreaElement | null;
          const note = noteEl?.value?.trim() ?? "";
          const syntheticReview: Pick<PlaceReviewRow, "review_state" | "note"> = {
            review_state: state,
            note: note || null,
          };
          activeInfo.infoWindow.setContent?.(
            buildAccommodationTooltipHtml(
              activeInfo.doc,
              syntheticReview as PlaceReviewRow,
              activeInfo.tooltipMeta,
            ),
          );
        }
        return;
      }

      const saveBtn = (e.target as HTMLElement).closest(".place-review-save");
      if (!saveBtn) return;
      e.preventDefault();
      const root = (e.target as HTMLElement).closest(".accommodation-tooltip");
      if (!root) return;
      const el = root as HTMLElement;
      if (el.dataset.saving === "true" || placeReviewSavingRef.current) return;
      const placeId = el.dataset.placeId;
      const placeName = el.dataset.placeName;
      const placeUrl = el.dataset.placeUrl;
      const address = el.dataset.address;
      const lat = el.dataset.lat;
      const lng = el.dataset.lng;
      const state = (el.dataset.currentState ?? "neutral") as ReviewState;
      const noteEl = root.querySelector(".place-review-note") as HTMLTextAreaElement | null;
      const note = noteEl?.value?.trim() ?? "";
      if (!placeId || !placeName) return;

      placeReviewSavingRef.current = true;
      const closeSnap = lockPlaceReviewTooltip(el);

      const placeKind = el.dataset.placeKind || "accommodation";
      const ctx = reviewContextRef.current;
      fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: placeId,
          place_name: placeName,
          place_url: placeUrl || null,
          address_name: address || null,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          place_kind: placeKind,
          review_state: state,
          note: note || null,
          route_id: ctx.routeId || null,
          plan_id: ctx.planId ?? null,
          stage_id: ctx.stageId ?? null,
        }),
      })
        .then((res) => {
          if (res.status === 401) {
            alert("로그인 후 저장할 수 있습니다.");
            return null;
          }
          if (!res.ok) {
            alert("저장에 실패했습니다.");
            return null;
          }
          return res.json() as Promise<PlaceReviewRow>;
        })
        .then((data) => {
          if (data) onReviewChangeRef.current?.(placeId, data);
        })
        .catch(() => {
          alert("저장에 실패했습니다.");
        })
        .finally(() => {
          placeReviewSavingRef.current = false;
          unlockPlaceReviewTooltip(el, closeSnap);
        });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedValue = window.localStorage.getItem(
      ACCOMMODATION_FILTER_STORAGE_KEY,
    );
    setAccommodationFilters(parseAccommodationFiltersFromStorage(savedValue));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ACCOMMODATION_FILTER_STORAGE_KEY,
      JSON.stringify(accommodationFilters),
    );
  }, [accommodationFilters]);

  useEffect(() => {
    if (!showSearchPopover) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchPopoverRef.current?.contains(target)) setShowSearchPopover(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showSearchPopover]);

  useEffect(() => {
    if (!route?.id) return;
    invalidateAllNearbyCache();
  }, [route?.id, invalidateAllNearbyCache]);

  const visibleNearbyDocs = useMemo(() => {
    if (activeCategory === "accommodation") {
      return filterAccommodationDocuments(
        nearbyDocs.accommodation,
        accommodationFilters,
      );
    }
    return nearbyDocs[activeCategory];
  }, [activeCategory, nearbyDocs, accommodationFilters]);

  useEffect(() => {
    const map = mapInstanceRef.current as KakaoMapInstance | null;
    const maps = window.kakao?.maps;
    if (!map || !maps) return;
    renderStarredMarkers(map, maps, starredDocs);
  }, [starredDocs, renderStarredMarkers]);

  useEffect(() => {
    const map = mapInstanceRef.current as KakaoMapInstance | null;
    const maps = window.kakao?.maps;
    if (!map || !maps) return;
    if (showNearbyPlaces) {
      renderNearbyMarkers(
        map,
        maps,
        activeCategory,
        visibleNearbyDocs,
        placeReviewsMap,
      );
    } else {
      clearAccommodationMarkers();
    }
    afterRouteDrawRef.current = (drawMap, drawMaps) => {
      if (showNearbyPlaces) {
        renderNearbyMarkers(
          drawMap,
          drawMaps,
          activeCategory,
          visibleNearbyDocs,
          placeReviewsMap,
        );
      } else {
        clearAccommodationMarkers();
      }
      renderStarredMarkers(drawMap, drawMaps, starredDocs);
    };
  }, [
    showNearbyPlaces,
    activeCategory,
    visibleNearbyDocs,
    placeReviewsMap,
    renderNearbyMarkers,
    clearAccommodationMarkers,
    starredDocs,
    renderStarredMarkers,
  ]);

  const computeBounds = useCallback(() => {
    const points = route?.track_points;
    if (!points?.length || !window.kakao?.maps) return null;
    const maps = window.kakao.maps;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of points) {
      const lat = p.y;
      const lng = p.x;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    if (minLat === Infinity) return null;
    const bounds = new maps.LatLngBounds();
    bounds.extend(new maps.LatLng(minLat, minLng));
    bounds.extend(new maps.LatLng(maxLat, maxLng));
    return bounds;
  }, [route?.track_points]);

  const handleZoomIn = useCallback(() => {
    const map = mapInstanceRef.current as {
      getLevel?: () => number;
      setLevel?: (n: number) => void;
    } | null;
    if (!map?.getLevel || !map?.setLevel) return;
    const level = map.getLevel();
    map.setLevel(Math.max(1, level - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapInstanceRef.current as {
      getLevel?: () => number;
      setLevel?: (n: number) => void;
    } | null;
    if (!map?.getLevel || !map?.setLevel) return;
    const level = map.getLevel();
    map.setLevel(Math.min(14, level + 1));
  }, []);

  const handleCenterOnMarker = useCallback(() => {
    const map = mapInstanceRef.current as {
      setCenter?: (l: unknown) => void;
      setLevel?: (n: number) => void;
    } | null;
    const maps = window.kakao?.maps;
    if (!map?.setCenter || !highlightPosition || !maps) return;
    const [lat, lng] = highlightPosition;
    map.setCenter(new maps.LatLng(lat, lng));
    if (map.setLevel) map.setLevel(ZOOM_LEVEL_ON_MARKER);
  }, [highlightPosition]);

  useEffect(() => {
    if (!autoCenterOnPin || !isPinned) return;
    void handleCenterOnMarker();
  }, [autoCenterOnPin, isPinned, highlightPosition, handleCenterOnMarker]);

  const handleFitCourse = useCallback(() => {
    const map = mapInstanceRef.current as {
      setBounds?: (b: unknown) => void;
    } | null;
    const bounds = computeBounds();
    if (!map?.setBounds || !bounds) return;
    map.setBounds(bounds);
  }, [computeBounds]);

  const isZoomRestricted = zoomLevel == null || zoomLevel > ZOOM_LIMIT_ACCOMMODATION;
  const isNearbySearchDisabled = isZoomRestricted || loadingCategory != null;

  const wasZoomRestrictedRef = useRef<boolean>(true);
  useEffect(() => {
    if (wasZoomRestrictedRef.current !== isZoomRestricted) {
      invalidateAllNearbyCache();
      wasZoomRestrictedRef.current = isZoomRestricted;
    }
  }, [isZoomRestricted, invalidateAllNearbyCache]);

  const handleNearbyCategoryClick = useCallback(
    (categoryId: NearbyCategoryId) => {
      if (isNearbySearchDisabled) return;
      const shouldReload = !isNearbyCacheUsable(categoryId);
      if (categoryId === activeCategory) {
        setShowSearchPopover((prev) => !prev);
        if (!showNearbyPlaces) setShowNearbyPlaces(true);
        if (shouldReload) void handleReloadNearby(categoryId);
        return;
      }
      setActiveCategory(categoryId);
      setShowSearchPopover(true);
      if (!showNearbyPlaces) setShowNearbyPlaces(true);
      if (shouldReload) void handleReloadNearby(categoryId);
    },
    [
      isNearbySearchDisabled,
      isNearbyCacheUsable,
      activeCategory,
      showNearbyPlaces,
      handleReloadNearby,
    ],
  );

  const handleAccommodationFilterChange = useCallback(
    (category: AccommodationCategory) => {
      setAccommodationFilters((prev) => ({
        ...prev,
        [category]: !prev[category],
      }));
    },
    [],
  );

  const handleSelectAllAccommodationFilters = useCallback(() => {
    setAccommodationFilters(DEFAULT_ACCOMMODATION_FILTERS);
  }, []);

  const handleResetAccommodationFilters = useCallback(() => {
    setAccommodationFilters({
      motel: false,
      hotel: false,
      inn: false,
      pension: false,
      camping: false,
      other: false,
    });
  }, []);

  // highlightPosition 변경 시 동그란 마커 overlay 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current as { getDiv?: () => HTMLElement } | null;
    const maps = window.kakao?.maps;
    if (!map || !maps) return;

    const overlay = highlightOverlayRef.current;
    if (!highlightPosition) {
      overlay?.setVisible(false);
      return;
    }

    const [lat, lng] = highlightPosition;
    const nextPosition = new maps.LatLng(lat, lng);

    if (overlay) {
      overlay.setMap(map);
      overlay.setPosition(nextPosition);
      overlay.setVisible(true);
      return;
    }

    const content = highlightCircleMarkerHtml(HIGHLIGHT_MARKER_SIZE, true);
    const newOverlay = new maps.CustomOverlay({
      map: map as never,
      position: nextPosition,
      content,
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 10,
      clickable: true,
    }) as KakaoCustomOverlay & { getContent?: () => unknown };
    highlightOverlayRef.current = newOverlay;

    const el = typeof newOverlay.getContent === "function"
      ? newOverlay.getContent()
      : null;
    const node = el instanceof HTMLElement
      ? el
      : (newOverlay as unknown as { a?: HTMLElement }).a?.querySelector?.(".highlight-marker-circle") ?? null;
    if (node instanceof HTMLElement) {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        onUnpinRef.current?.();
      });
    }
  }, [highlightPosition]);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!appKey) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          NEXT_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.
        </p>
      </div>
    );
  }

  const btnClass =
    "w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white";

  return (
    <div className="relative h-full w-full">
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />
      <div ref={containerCallbackRef} className="h-full w-full" />
      {mapReady && (
        <div
          ref={searchPopoverRef}
          className="absolute top-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
        >
          <div className="flex max-w-[calc(100vw-2rem)] flex-nowrap items-center justify-end gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NEARBY_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const isLoading = loadingCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleNearbyCategoryClick(cat.id)}
                  disabled={isNearbySearchDisabled}
                  className={
                    isActive
                      ? "inline-flex h-8 shrink-0 items-center gap-0.5 rounded border border-blue-500 bg-blue-500 px-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      : "inline-flex h-8 shrink-0 items-center gap-0.5 rounded border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                  aria-label={`${cat.label} 주변 탐색`}
                  aria-pressed={isActive}
                  title={
                    zoomLevel != null && zoomLevel > ZOOM_LIMIT_ACCOMMODATION
                      ? "줌 레벨 7 이하에서만 사용 가능"
                      : `${cat.label} 주변 탐색`
                  }
                >
                  {isLoading ? (
                    <span
                      className={
                        isActive
                          ? "size-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                          : "size-4 shrink-0 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
                      }
                    />
                  ) : (
                    <span className={isActive ? "text-white" : "text-gray-600"}>
                      {nearbyCategoryIcon(cat.id)}
                    </span>
                  )}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
          {showSearchPopover && (
            <div className="w-64 shrink-0 rounded border border-gray-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-semibold text-gray-800">
                  {
                    NEARBY_CATEGORIES.find((c) => c.id === activeCategory)
                      ?.label
                  }
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleNearbyVisibilityToggle()}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {showNearbyPlaces ? "숨기기" : "표시"}
                  </button>
                </div>
              </div>
              <p className="mb-2 text-xs text-gray-500">현재 지도 범위 내 결과</p>
              {activeCategory === "accommodation" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOMMODATION_CATEGORY_OPTIONS.map((option) => (
                      <label
                        key={option.category}
                        className="flex cursor-pointer items-center justify-between rounded border border-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span>{option.label}</span>
                        <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                          {accommodationCategoryCounts[option.category]}
                        </span>
                        <input
                          type="checkbox"
                          className="ml-2"
                          checked={accommodationFilters[option.category]}
                          onChange={() =>
                            handleAccommodationFilterChange(option.category)
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-600 hover:underline"
                      onClick={handleSelectAllAccommodationFilters}
                    >
                      전체
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-600 hover:underline"
                      onClick={handleResetAccommodationFilters}
                    >
                      초기화
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-700">
                  {nearbyDocs[activeCategory].length}개 장소
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {mapReady && (
        <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className={btnClass}
            aria-label="줌 인"
          >
            <span className="text-lg font-medium leading-none">+</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className={btnClass}
            aria-label="줌 아웃"
          >
            <span className="text-lg font-medium leading-none">−</span>
          </button>
          <button
            type="button"
            onClick={handleCenterOnMarker}
            disabled={!highlightPosition}
            className={btnClass}
            aria-label="마커로 이동"
          >
            <Locate className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleFitCourse}
            disabled={!route?.track_points?.length}
            className={btnClass}
            aria-label="전체 경로 보기"
          >
            <Expand className="size-4" />
          </button>
        </div>
      )}
      {mapReady && zoomLevel != null && (
        <div className="absolute bottom-4 left-4 z-10 rounded bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow dark:bg-zinc-800/90 dark:text-zinc-300">
          줌 레벨 {zoomLevel}
        </div>
      )}
    </div>
  );
}
