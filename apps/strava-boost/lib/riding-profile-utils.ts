import type { ActivityStreams, ChartPoint, PauseSegment } from "@/src/types";

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
      streamIndex: i,
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

// 속도 < 0.5 m/s (1.8 km/h)로 60초 이상 지속된 구간을 휴식으로 판정
const PAUSE_SPEED_THRESHOLD_MPS = 0.5;
const PAUSE_MIN_DURATION_SEC = 60;

export function detectPauses(
  streams: ActivityStreams,
  startMs: number,
  minDurationSec = PAUSE_MIN_DURATION_SEC,
): PauseSegment[] {
  const len = Math.min(
    streams.altitude.length,
    streams.distance.length,
    streams.time.length,
  );
  const pauses: PauseSegment[] = [];
  let pauseStartIdx: number | null = null;

  for (let i = 1; i < len; i++) {
    const dt = streams.time[i] - streams.time[i - 1];
    const dd = streams.distance[i] - streams.distance[i - 1];
    const speed = dt > 0 ? dd / dt : 0;
    const isPaused = speed < PAUSE_SPEED_THRESHOLD_MPS;

    if (isPaused && pauseStartIdx === null) {
      pauseStartIdx = i - 1;
    } else if (!isPaused && pauseStartIdx !== null) {
      const duration = streams.time[i - 1] - streams.time[pauseStartIdx];
      if (duration >= minDurationSec) {
        pauses.push(makePauseSegment(streams, pauseStartIdx, i - 1, startMs));
      }
      pauseStartIdx = null;
    }
  }

  if (pauseStartIdx !== null) {
    const duration = streams.time[len - 1] - streams.time[pauseStartIdx];
    if (duration >= minDurationSec) {
      pauses.push(makePauseSegment(streams, pauseStartIdx, len - 1, startMs));
    }
  }

  return pauses;
}

function makePauseSegment(
  streams: ActivityStreams,
  startIdx: number,
  endIdx: number,
  startMs: number,
): PauseSegment {
  return {
    distanceKmStart: streams.distance[startIdx] / 1000,
    distanceKmEnd: streams.distance[endIdx] / 1000,
    elapsedSecondsStart: streams.time[startIdx],
    elapsedSecondsEnd: streams.time[endIdx],
    absoluteMsStart: startMs + streams.time[startIdx] * 1000,
    absoluteMsEnd: startMs + streams.time[endIdx] * 1000,
  };
}
