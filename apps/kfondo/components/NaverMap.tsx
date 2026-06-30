"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Locate } from "lucide-react";
import type { NaverMapInstance } from "@/types/naver-maps";

type NaverMapProps = {
  width?: string;
  height?: string;
  /** 각 polyline은 [lat, lng][] 배열. 그리기 후 fitBounds 적용 */
  polylines?: [number, number][][];
  /** 고도 그래프 등에서 하이라이트할 위치. [lat, lng] 또는 null */
  highlightPosition?: [number, number] | null;
};

const DEFAULT_CENTER = { lat: 35.9, lng: 128.0 };
const DEFAULT_ZOOM = 8;
/** emerald 보색 계열, 부드러운 로즈 (Tailwind rose-400) */
const STROKE_COLOR = "#fb7185";
const STROKE_WEIGHT = 4;
/** fitBounds 시 픽셀 단위 여백 (FitBoundsOptions) */
const FIT_BOUNDS_PADDING = 24;

const HIGHLIGHT_MARKER_SIZE = 16;
/** 사이트 컬러 emerald (Tailwind emerald-500) */
const HIGHLIGHT_MARKER_COLOR = "#10b981";

function highlightCircleMarkerHtml(size: number): string {
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${HIGHLIGHT_MARKER_COLOR};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;
}

export function NaverMap({
  width = "100%",
  height = "100%",
  polylines,
  highlightPosition = null,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMapInstance | null>(null);
  const polylineInstancesRef = useRef<unknown[]>([]);
  const highlightMarkerRef = useRef<unknown>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const clientId =
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "YOUR_NAVER_CLIENT_ID";

    if (typeof window !== "undefined" && window.naver?.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => initMap();
    script.onerror = () => {
      console.error("네이버맵 API 스크립트 로드 실패");
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  function initMap() {
    if (!mapRef.current || !window.naver?.maps) return;
    try {
      const map = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(
          DEFAULT_CENTER.lat,
          DEFAULT_CENTER.lng
        ),
        zoom: DEFAULT_ZOOM,
      } as Record<string, unknown>) as unknown as NaverMapInstance;
      mapInstanceRef.current = map;
      setIsMapLoaded(true);
    } catch (error) {
      console.error("네이버맵 초기화 실패:", error);
    }
  }

  useEffect(() => {
    if (!isMapLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const maps = window.naver.maps;

    polylineInstancesRef.current.forEach((p) => {
      const poly = p as { setMap: (m: null) => void };
      if (poly?.setMap) poly.setMap(null);
    });
    polylineInstancesRef.current = [];

    if (polylines?.length) {
      polylines.forEach((path) => {
        if (path.length === 0) return;
        const latlngs = path.map(
          ([lat, lng]) => new maps.LatLng(lat, lng) as unknown
        );
        const polyline = new maps.Polyline({
          path: latlngs,
          map: map as unknown,
          strokeColor: STROKE_COLOR,
          strokeWeight: STROKE_WEIGHT,
        });
        polylineInstancesRef.current.push(polyline);
      });
    }
  }, [isMapLoaded, polylines]);

  useEffect(() => {
    if (!isMapLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    if (!polylines?.length) return;
    const map = mapInstanceRef.current;
    const maps = window.naver.maps;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    polylines.forEach((path) => {
      path.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });
    });
    if (minLat === Infinity) return;
    const bounds = new maps.LatLngBounds();
    bounds.extend(new maps.LatLng(minLat, minLng) as unknown);
    bounds.extend(new maps.LatLng(maxLat, maxLng) as unknown);
    const fitOptions = {
      top: FIT_BOUNDS_PADDING,
      right: FIT_BOUNDS_PADDING,
      bottom: FIT_BOUNDS_PADDING,
      left: FIT_BOUNDS_PADDING,
    };
    map.fitBounds(bounds, fitOptions);
  }, [isMapLoaded, polylines]);

  useEffect(() => {
    if (!isMapLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const maps = window.naver.maps;
    const prev = highlightMarkerRef.current as { setMap: (m: null) => void } | null;
    if (prev?.setMap) prev.setMap(null);
    highlightMarkerRef.current = null;
    if (highlightPosition) {
      const [lat, lng] = highlightPosition;
      const position = new maps.LatLng(lat, lng);
      const size = HIGHLIGHT_MARKER_SIZE;
      const anchor = size / 2;
      const Point = (maps as { Point?: new (x: number, y: number) => unknown }).Point;
      const markerOptions: { position: unknown; map: unknown; icon?: { content: string; anchor: unknown } } = {
        position,
        map: map as unknown,
      };
      if (Point) {
        markerOptions.icon = {
          content: highlightCircleMarkerHtml(size),
          anchor: new Point(anchor, anchor),
        };
      }
      const marker = new maps.Marker(
        markerOptions as { position: unknown; map: unknown }
      );
      highlightMarkerRef.current = marker;
    }
  }, [isMapLoaded, highlightPosition]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const observer = new ResizeObserver(() => {
      if (!map?.getZoom || !map?.setZoom || !map?.getCenter || !map?.setCenter)
        return;
      const zoom = map.getZoom();
      const center = map.getCenter();
      const autoResize = (map as { autoResize?: () => void }).autoResize;
      if (typeof autoResize === "function") autoResize.call(map);
      requestAnimationFrame(() => {
        map.setZoom(zoom);
        map.setCenter(center);
      });
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isMapLoaded]);

  const computeBounds = () => {
    if (!polylines?.length) return null;
    const maps = window.naver?.maps;
    if (!maps) return null;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    polylines.forEach((path) => {
      path.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });
    });
    if (minLat === Infinity) return null;
    const bounds = new maps.LatLngBounds();
    bounds.extend(new maps.LatLng(minLat, minLng) as unknown);
    bounds.extend(new maps.LatLng(maxLat, maxLng) as unknown);
    return bounds;
  };

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map?.getZoom || !map?.setZoom) return;
    map.setZoom(Math.min(21, map.getZoom() + 1));
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map?.getZoom || !map?.setZoom) return;
    map.setZoom(Math.max(1, map.getZoom() - 1));
  };

  const handleCenterOnMarker = () => {
    const map = mapInstanceRef.current;
    if (!map?.setCenter || !highlightPosition) return;
    const [lat, lng] = highlightPosition;
    const maps = window.naver?.maps;
    if (!maps) return;
    map.setCenter(new maps.LatLng(lat, lng));
  };

  const handleFitCourse = () => {
    const map = mapInstanceRef.current;
    const bounds = computeBounds();
    if (!map?.fitBounds || !bounds) return;
    map.fitBounds(bounds, {
      top: FIT_BOUNDS_PADDING,
      right: FIT_BOUNDS_PADDING,
      bottom: FIT_BOUNDS_PADDING,
      left: FIT_BOUNDS_PADDING,
    });
  };

  return (
    <div className="relative w-full h-full" style={{ width, height }}>
      <div ref={mapRef} className="w-full h-full min-h-0" />
      {isMapLoaded && (
        <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700"
            aria-label="줌 인"
          >
            <span className="text-lg font-medium leading-none">+</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700"
            aria-label="줌 아웃"
          >
            <span className="text-lg font-medium leading-none">−</span>
          </button>
          <button
            type="button"
            onClick={handleCenterOnMarker}
            disabled={!highlightPosition}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            aria-label="마커로 이동"
          >
            <Locate className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleFitCourse}
            disabled={!polylines?.length}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            aria-label="전체 코스 보기"
          >
            <Expand className="size-4" />
          </button>
        </div>
      )}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-600">지도를 로딩 중...</span>
        </div>
      )}
    </div>
  );
}
