import type { StageBriefingResponse } from "@my-ridings/weather-types";
import { useQueries, useQuery } from "@tanstack/react-query";

import { fetchPlanStageForecastAlong } from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";

export const planStageForecastQueryKey = (planId: string, dayNumber: number) =>
	["planStageForecast", planId, dayNumber] as const;

const TEN_MIN_MS = 10 * 60 * 1000;

const midSkyTextSuggestsPrecip = (s: string | null | undefined) => {
	if (!s?.trim()) return false;
	return /비|눈|소나기|뇌우|우박|한때.*[비눈]|가끔.*[비눈]/.test(s);
};

export type StageCardSummary = {
	showWind: boolean;
	/** SF Symbol name */
	iconName: string;
	tempMin: number | null;
	tempMax: number | null;
	popMax: number | null;
	windMin: number | null;
	windMax: number | null;
	hasData: boolean;
};

export function buildStageCardSummary(
	data: StageBriefingResponse | undefined,
): StageCardSummary | null {
	if (!data?.points?.length) return null;
	if (data.mode === "mid") {
		let tmn: number | null = null;
		let tmx: number | null = null;
		let popMax: number | null = null;
		let anyBad = false;
		let sawRow = false;
		for (const p of data.points) {
			const d = p.daily;
			if (!d) continue;
			sawRow = true;
			if (d.tmn != null) tmn = tmn == null ? d.tmn : Math.min(tmn, d.tmn);
			if (d.tmx != null) tmx = tmx == null ? d.tmx : Math.max(tmx, d.tmx);
			for (const pop of [d.amPop, d.pmPop]) {
				if (pop != null) popMax = popMax == null ? pop : Math.max(popMax, pop);
			}
			if (midSkyTextSuggestsPrecip(d.amSky) || midSkyTextSuggestsPrecip(d.pmSky)) anyBad = true;
		}
		const iconName = anyBad ? "cloud.rain.fill" : "sun.max.fill";
		const hasData = sawRow && (tmn != null || tmx != null || popMax != null || anyBad);
		if (!hasData)
			return {
				showWind: false,
				iconName,
				tempMin: null,
				tempMax: null,
				popMax: null,
				windMin: null,
				windMax: null,
				hasData: false,
			};
		return {
			showWind: false,
			iconName,
			tempMin: tmn,
			tempMax: tmx,
			popMax,
			windMin: null,
			windMax: null,
			hasData: true,
		};
	}
	const temps: number[] = [];
	const pops: number[] = [];
	const winds: number[] = [];
	let maxPty = 0;
	let repSky: number | null = 1;
	let repPty: number | null = null;
	for (const p of data.points) {
		for (const h of p.hourly) {
			if (h.tempC != null) temps.push(h.tempC);
			if (h.popPct != null) pops.push(h.popPct);
			if (h.windMs != null) winds.push(h.windMs);
			const ptyN = h.pty ?? 0;
			if (ptyN > maxPty) {
				maxPty = ptyN;
				repPty = h.pty;
				repSky = h.sky ?? null;
			}
		}
	}
	const popM = pops.length ? Math.max(...pops) : null;
	if (maxPty === 0 && popM != null && popM >= 30) {
		repPty = 1;
	}
	const iconName = weatherIconName(repSky, repPty);
	const tMin = temps.length ? Math.min(...temps) : null;
	const tMax = temps.length ? Math.max(...temps) : null;
	const wMin = winds.length ? Math.min(...winds) : null;
	const wMax = winds.length ? Math.max(...winds) : null;
	const hasHourly = data.points.some((p) => p.hourly.length > 0);
	const hasData = hasHourly && (temps.length > 0 || pops.length > 0);
	if (!hasData) {
		return {
			showWind: true,
			iconName,
			tempMin: null,
			tempMax: null,
			popMax: null,
			windMin: null,
			windMax: null,
			hasData: false,
		};
	}
	return {
		showWind: true,
		iconName,
		tempMin: tMin,
		tempMax: tMax,
		popMax: popM,
		windMin: wMin,
		windMax: wMax,
		hasData: true,
	};
}

export function usePlanStageForecastsQuery(planId: string | undefined, stageCount: number) {
	return useQueries({
		queries: Array.from({ length: stageCount }, (_, i) => {
			const dayNumber = i + 1;
			return {
				queryKey: planStageForecastQueryKey(planId ?? "__none__", dayNumber),
				queryFn: async (): Promise<StageBriefingResponse> => {
					const origin = getApiOrigin();
					if (!origin) throw new Error("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
					const token = await getStoredAccessToken();
					if (!token) throw new Error("UNAUTHENTICATED");
					return fetchPlanStageForecastAlong(origin, token, planId!, { dayNumber });
				},
				enabled: Boolean(planId && stageCount > 0),
				staleTime: TEN_MIN_MS,
			};
		}),
	});
}

export function usePlanStageForecastQuery(planId: string | undefined, dayNumber: number) {
	return useQuery({
		queryKey: planStageForecastQueryKey(planId ?? "__none__", dayNumber),
		queryFn: async (): Promise<StageBriefingResponse> => {
			const origin = getApiOrigin();
			if (!origin) throw new Error("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
			const token = await getStoredAccessToken();
			if (!token) throw new Error("UNAUTHENTICATED");
			return fetchPlanStageForecastAlong(origin, token, planId!, { dayNumber });
		},
		enabled: Boolean(planId && dayNumber >= 1),
		staleTime: TEN_MIN_MS,
	});
}

export function weatherIconName(sky: number | null, pty: number | null): string {
	if (pty != null && pty > 0) {
		if (pty === 1) return "cloud.rain.fill";
		if (pty === 2) return "cloud.sleet.fill";
		if (pty === 3) return "cloud.snow.fill";
		return "cloud.heavyrain.fill";
	}
	if (sky === 1) return "sun.max.fill";
	if (sky === 3) return "cloud.sun.fill";
	if (sky === 4) return "cloud.fill";
	return "cloud.sun.fill";
}

export function skyLabel(sky: number | null, pty: number | null): string {
	if (pty === 1) return "비";
	if (pty === 2) return "진눈개비";
	if (pty === 3) return "눈";
	if (pty === 4) return "소나기";
	if (sky === 1) return "맑음";
	if (sky === 3) return "구름많음";
	if (sky === 4) return "흐림";
	return "";
}
