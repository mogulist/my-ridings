import type { AlongForecastResponse, StageBriefingResponse, StageShortPoint } from '@my-ridings/weather-types';

const ANCHORS = [6, 10, 14, 17, 20] as const;

const segToPoint = (seg: AlongForecastResponse['segments'][0], i: number): StageShortPoint => {
	const { forecast: fc, etaAt, grid, midpoint, fromKm, toKm } = seg;
	return {
		index: i,
		kmAlong: (fromKm + toKm) / 2,
		gridLabel: `격자 ${grid.nx}·${grid.ny}`,
		nx: grid.nx,
		ny: grid.ny,
		midpoint: { ...midpoint },
		scrollAnchorLocalHour: ANCHORS[Math.min(i, 4)]!,
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

/** 구 `AlongForecastResponse`(segments) → UI가 기대하는 `StageBriefingResponse`(5 points). 구간이 5개 미만이면 마지막 구간을 패딩. */
export const alongForecastToStageBriefing = (legacy: AlongForecastResponse): StageBriefingResponse => {
	const segs = legacy.segments;
	if (!segs.length) {
		throw new Error('Legacy forecast has no segments');
	}
	const first = segs[0];
	const targetDate = (first?.etaAt ?? new Date().toISOString()).slice(0, 10);
	const n = segs.length;
	const points: StageShortPoint[] = [];
	for (let i = 0; i < 5; i += 1) {
		points.push(segToPoint(segs[Math.min(i, n - 1)]!, i));
	}
	return {
		mode: 'short',
		targetDate,
		totalKm: legacy.totalKm,
		points,
	};
};
