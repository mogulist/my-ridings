import type { AlongForecastResponse } from '@my-ridings/weather-types';
import { useQueries } from '@tanstack/react-query';

import { fetchPlanStageForecastAlong } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';

export const planStageForecastQueryKey = (planId: string, dayNumber: number) =>
  ['planStageForecast', planId, dayNumber] as const;

const TEN_MIN_MS = 10 * 60 * 1000;

export function usePlanStageForecastsQuery(planId: string | undefined, stageCount: number) {
  return useQueries({
    queries: Array.from({ length: stageCount }, (_, i) => {
      const dayNumber = i + 1;
      return {
        queryKey: planStageForecastQueryKey(planId ?? '__none__', dayNumber),
        queryFn: async (): Promise<AlongForecastResponse> => {
          const origin = getApiOrigin();
          if (!origin) throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');
          const token = await getStoredAccessToken();
          if (!token) throw new Error('UNAUTHENTICATED');
          return fetchPlanStageForecastAlong(origin, token, planId!, {
            dayNumber,
            segments: 4,
            paceKmh: 22,
          });
        },
        enabled: Boolean(planId && stageCount > 0),
        staleTime: TEN_MIN_MS,
      };
    }),
  });
}

export function formatStageForecastSummary(data: AlongForecastResponse | undefined): string | null {
  if (!data?.segments?.length) return null;
  const mid = data.segments[Math.floor(data.segments.length / 2)]?.forecast;
  if (!mid) return null;
  const t = mid.tempC;
  const pop = mid.popPct;
  if (t == null && pop == null) return null;
  const parts: string[] = [];
  if (t != null) parts.push(`${t.toFixed(1)}°`);
  if (pop != null) parts.push(`강수 ${pop}%`);
  return parts.join(' · ');
}
