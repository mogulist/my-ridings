"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Locate } from "lucide-react";
import type { NaverMapInstance, NaverLatLngBounds, FitBoundsOptions } from "@/types/naver-maps";

type RouteMapProps = {
  width?: string;
  height?: string;
  /** 경로 좌표 배열 [lat, lng][] */
  polyline?: [number, number][];
  /** 현재 위치 하이라이트 [lat, lng] */
  highlightPosition?: [number, number] | null;
};

const STROKE_COLOR = "#f97316";
const STROKE_WEIGHT = 3;
const FIT_BOUNDS_PADDING = 24;
const HIGHLIGHT_SIZE = 14;
const HIGHLIGHT_COLOR = "#3b82f6";

function highlightHtml(size: number): string {
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${HIGHLIGHT_COLOR};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`;
}

export function RouteMap({
  width = "100%",
  height = "100%",
  polyline,
  highlightPosition = null,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMapInstance | null>(null);
  const polylineRef = useRef<unknown>(null);
  const highlightMarkerRef = useRef<unknown>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

    if (typeof window !== "undefined" && window.naver?.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  function initMap() {
    if (!mapRef.current || !window.naver?.maps) return;
    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(36.5, 127.8),
      zoom: 7,
    } as Record<string, unknown>) as unknown as NaverMapInstance;
    mapInstanceRef.current = map;
    setIsLoaded(true);
  }

  // 경로 폴리라인 그리기
  useEffect(() => {
    if (!isLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    const maps = window.naver.maps;
    const prev = polylineRef.current as { setMap: (m: null) => void } | null;
    if (prev?.setMap) prev.setMap(null);
    polylineRef.current = null;

    if (polyline && polyline.length > 0) {
      const path = polyline.map(([lat, lng]) => new maps.LatLng(lat, lng) as unknown);
      const line = new maps.Polyline({
        path,
        map: mapInstanceRef.current as unknown,
        strokeColor: STROKE_COLOR,
        strokeWeight: STROKE_WEIGHT,
      });
      polylineRef.current = line;
    }
  }, [isLoaded, polyline]);

  // fitBounds (경로가 처음 로드될 때)
  useEffect(() => {
    if (!isLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    if (!polyline || polyline.length === 0) return;
    const maps = window.naver.maps;

    const bounds = new maps.LatLngBounds() as NaverLatLngBounds;
    for (const [lat, lng] of polyline) {
      bounds.extend(new maps.LatLng(lat, lng) as unknown);
    }
    const padding: FitBoundsOptions = {
      top: FIT_BOUNDS_PADDING,
      right: FIT_BOUNDS_PADDING,
      bottom: FIT_BOUNDS_PADDING,
      left: FIT_BOUNDS_PADDING,
    };
    mapInstanceRef.current.fitBounds(bounds, padding);
  }, [isLoaded, polyline]);

  // 하이라이트 마커
  useEffect(() => {
    if (!isLoaded || !window.naver?.maps || !mapInstanceRef.current) return;
    const maps = window.naver.maps;
    const prev = highlightMarkerRef.current as { setMap: (m: null) => void } | null;
    if (prev?.setMap) prev.setMap(null);
    highlightMarkerRef.current = null;

    if (highlightPosition) {
      const [lat, lng] = highlightPosition;
      const position = new maps.LatLng(lat, lng);
      const anchor = HIGHLIGHT_SIZE / 2;
      const Point = (maps as { Point?: new (x: number, y: number) => unknown }).Point;
      const options: { position: unknown; map: unknown; icon?: unknown } = {
        position,
        map: mapInstanceRef.current as unknown,
      };
      if (Point) {
        options.icon = {
          content: highlightHtml(HIGHLIGHT_SIZE),
          anchor: new Point(anchor, anchor),
        };
      }
      const marker = new maps.Marker(options as { position: unknown; map: unknown });
      highlightMarkerRef.current = marker;
    }
  }, [isLoaded, highlightPosition]);

  // ResizeObserver
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const observer = new ResizeObserver(() => {
      if (!map?.getZoom || !map?.setZoom || !map?.getCenter || !map?.setCenter) return;
      const zoom = map.getZoom();
      const center = map.getCenter();
      if (typeof map.autoResize === "function") map.autoResize();
      requestAnimationFrame(() => {
        map.setZoom(zoom);
        map.setCenter(center);
      });
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [isLoaded]);

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

  const handleCenter = () => {
    const map = mapInstanceRef.current;
    if (!map?.setCenter || !highlightPosition) return;
    const [lat, lng] = highlightPosition;
    const maps = window.naver?.maps;
    if (!maps) return;
    map.setCenter(new maps.LatLng(lat, lng));
  };

  const handleFitCourse = () => {
    if (!polyline || polyline.length === 0) return;
    const map = mapInstanceRef.current;
    const maps = window.naver?.maps;
    if (!map?.fitBounds || !maps) return;
    const bounds = new maps.LatLngBounds() as NaverLatLngBounds;
    for (const [lat, lng] of polyline) bounds.extend(new maps.LatLng(lat, lng) as unknown);
    map.fitBounds(bounds, {
      top: FIT_BOUNDS_PADDING,
      right: FIT_BOUNDS_PADDING,
      bottom: FIT_BOUNDS_PADDING,
      left: FIT_BOUNDS_PADDING,
    });
  };

  return (
    <div className="relative" style={{ width, height }}>
      <div ref={mapRef} className="w-full h-full min-h-0" />
      {isLoaded && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
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
            onClick={handleCenter}
            disabled={!highlightPosition}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="현재 위치로 이동"
          >
            <Locate className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleFitCourse}
            disabled={!polyline?.length}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="전체 코스 보기"
          >
            <Expand className="size-4" />
          </button>
        </div>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-500">지도 로딩 중...</span>
        </div>
      )}
    </div>
  );
}
