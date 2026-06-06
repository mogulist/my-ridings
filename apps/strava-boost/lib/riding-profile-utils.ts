import type { ActivityStreams, ChartPoint } from "@/src/types";

export function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.min(Math.round(i * step), arr.length - 1)]);
}

export function buildChartData(streams: ActivityStreams, startMs: number): ChartPoint[] {
  const len = Math.min(
    streams.altitude.length,
    streams.distance.length,
    streams.time.length,
  );
  const raw: ChartPoint[] = [];
  for (let i = 0; i < len; i++) {
    raw.push({
      distanceKm: Math.round(streams.distance[i] / 100) / 10,
      elapsedSeconds: streams.time[i],
      absoluteMs: startMs + streams.time[i] * 1000,
      altitude: Math.round(streams.altitude[i]),
    });
  }
  return downsample(raw, 2000);
}

export function formatDistanceAxis(km: number): string {
  return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
}

export function formatRelativeTimeAxis(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}분`;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatAbsoluteTimeAxis(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatAbsoluteTimeTooltip(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
