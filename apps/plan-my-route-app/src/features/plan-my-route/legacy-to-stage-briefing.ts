import type { AlongForecastResponse, StageBriefingResponse, StageShortPoint } from "@my-ridings/weather-types";

const segToPoint = (seg: AlongForecastResponse["segments"][0], i: number, n: number): StageShortPoint => {
	const { forecast: fc, etaAt, grid, midpoint, fromKm, toKm } = seg;
	return {
		index: i,
		position: n <= 1 ? "departure" : i === 0 ? "departure" : i === n - 1 ? "arrival" : "along",
		kmFrom: fromKm,
		kmTo: toKm,
		regionName: null,
		nx: grid.nx,
		ny: grid.ny,
		midpoint: { ...midpoint },
		hourly: [
			{
				at: fc.baseAt ?? etaAt,
				tempC: fc.tempC,
				popPct: fc.popPct,
				sky: fc.sky,
				pty: fc.pty,
				windMs: fc.windMs,
				humidityPct: fc.humidityPct,
				rainMm: fc.rainMm,
				snowCm: fc.snowCm,
			},
		],
	};
};

/** 구 `AlongForecastResponse`(segments) → `StageBriefingResponse`. 구간이 5개 미만이면 마지막 구간을 패딩. */
export const alongForecastToStageBriefing = (legacy: AlongForecastResponse): StageBriefingResponse => {
	const segs = legacy.segments;
	if (!segs.length) {
		throw new Error("Legacy forecast has no segments");
	}
	const first = segs[0];
	const targetDate = (first?.etaAt ?? new Date().toISOString()).slice(0, 10);
	const n = segs.length;
	const points: StageShortPoint[] = [];
	for (let i = 0; i < 5; i += 1) {
		points.push(segToPoint(segs[Math.min(i, n - 1)]!, i, 5));
	}
	const baseIsoList = segs
		.map((s) => s.forecast.baseAt)
		.filter((x): x is string => typeof x === "string" && x.length > 0);
	const forecastBaseAt =
		baseIsoList.length === 0
			? null
			: new Date(Math.min(...baseIsoList.map((iso) => new Date(iso).getTime()))).toISOString();
	return {
		mode: "short",
		targetDate,
		totalKm: legacy.totalKm,
		forecastBaseAt,
		points,
	};
};
