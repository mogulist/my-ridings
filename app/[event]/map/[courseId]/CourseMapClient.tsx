"use client";

import { useEffect, useRef, useState } from "react";
import { Mountain, Route } from "lucide-react";
import { NaverMap } from "@/components/NaverMap";
import { Slider } from "@/components/ui/slider";
import { useMobile } from "@/hooks/use-mobile";
import { fetchGpxAsPointsWithDistance } from "@/lib/gpx";
import {
  ElevationProfile,
  fromGpxPoints,
  nearestProfilePoint,
  type ProfilePoint,
} from "@my-ridings/elevation-profile";

type CourseMapClientProps = {
  gpxBlobUrl: string;
};

export function CourseMapClient({ gpxBlobUrl }: CourseMapClientProps) {
  const isMobile = useMobile();
  const [profilePoints, setProfilePoints] = useState<ProfilePoint[]>([]);
  const polylinesRef = useRef<[number, number][][] | null>(null);
  const [highlightedPoint, setHighlightedPoint] = useState<ProfilePoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGpxAsPointsWithDistance(gpxBlobUrl)
      .then((points) => {
        if (!cancelled && points.length > 0) {
          const converted = fromGpxPoints(points);
          setProfilePoints(converted);
          polylinesRef.current = [
            points.map((p) => [p.lat, p.lng] as [number, number]),
          ];
        } else if (!cancelled) {
          setError("경로 포인트를 찾을 수 없습니다.");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "경로 로드 실패");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gpxBlobUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-gray-100">
        <span className="text-gray-600">경로를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-gray-100">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const polylines: [number, number][][] =
    profilePoints.length > 0 ? polylinesRef.current ?? [] : [];
  const highlightPosition: [number, number] | null =
    highlightedPoint?.lat != null && highlightedPoint?.lng != null
      ? [highlightedPoint.lat, highlightedPoint.lng]
      : null;

  const minKm = profilePoints[0]?.distanceKm ?? 0;
  const maxKm = profilePoints[profilePoints.length - 1]?.distanceKm ?? 0;
  const sliderValue =
    highlightedPoint != null
      ? ((highlightedPoint.distanceKm - minKm) / (maxKm - minKm || 1)) * 100
      : 0;

  const handleSliderChange = (value: number[]) => {
    const ratio = Math.max(0, Math.min(1, value[0] / 100));
    const distanceKm = minKm + ratio * (maxKm - minKm);
    const point = nearestProfilePoint(distanceKm, profilePoints);
    if (point) setHighlightedPoint(point);
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      <div className="flex-1 min-h-0 w-full">
        <NaverMap
          polylines={polylines}
          highlightPosition={highlightPosition}
          width="100%"
          height="100%"
        />
      </div>
      <div className="shrink-0 border-t border-border bg-card px-3 py-2 min-h-[140px] h-[22dvh] max-h-[200px] flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ElevationProfile
            data={profilePoints}
            onHoverPoint={isMobile ? undefined : setHighlightedPoint}
            zoom={false}
            height={undefined}
            className="h-full"
          />
        </div>
        {isMobile && (
          <div className="shrink-0 mt-2 flex w-full">
            <div className="w-9 shrink-0" />
            <div className="flex-1 min-w-0 pr-2 flex flex-col gap-1">
              {highlightedPoint != null && (
                <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="size-3.5 shrink-0" aria-hidden />
                    <span>{highlightedPoint.distanceKm.toFixed(2)} km</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mountain className="size-3.5 shrink-0" aria-hidden />
                    <span>{highlightedPoint.elevationM.toFixed(1)} m</span>
                  </span>
                </p>
              )}
              <Slider
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                max={100}
                step={100 / Math.max(100, Math.min(profilePoints.length, 2000))}
                aria-label="코스 구간 위치 선택"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
