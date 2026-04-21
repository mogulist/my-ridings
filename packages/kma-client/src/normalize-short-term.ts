import type { VilageFcstItem } from "./short-term-schema";

/**
 * KMA 발표시각(baseDate + baseTime, KST)을 UTC ISO 문자열로.
 *   "20260421" + "0500" → "2026-04-20T20:00:00.000Z"
 */
export const kstYmdHmToUtcIso = (ymd: string, hm: string): string => {
	if (!/^\d{8}$/.test(ymd) || !/^\d{4}$/.test(hm)) {
		throw new Error(`invalid KST ymd/hm: ${ymd} ${hm}`);
	}
	const y = Number(ymd.slice(0, 4));
	const m = Number(ymd.slice(4, 6));
	const d = Number(ymd.slice(6, 8));
	const hh = Number(hm.slice(0, 2));
	const mm = Number(hm.slice(2, 4));
	const kstMs = Date.UTC(y, m - 1, d, hh, mm, 0) - 9 * 60 * 60 * 1000;
	return new Date(kstMs).toISOString();
};

export type ShortTermHourly = {
	forecastAt: string;
	tempC: number | null;
	popPct: number | null;
	sky: number | null;
	pty: number | null;
	windMs: number | null;
	humidityPct: number | null;
	rainMm: number | null;
	snowCm: number | null;
};

export type NormalizedShortTerm = {
	nx: number;
	ny: number;
	baseAt: string;
	hourly: ShortTermHourly[];
};

const parsePcp = (v: string | number): number | null => {
	if (typeof v === "number") return v;
	const s = v.trim();
	if (s === "" || s === "강수없음" || s === "-" || s === "0") return 0;
	if (s === "1mm 미만" || s === "1.0mm 미만") return 0.5;
	if (s === "30.0~50.0mm") return 40;
	if (s === "50.0mm 이상") return 60;
	const m = s.match(/([\d.]+)/);
	return m ? Number(m[1]) : null;
};

const parseSno = (v: string | number): number | null => {
	if (typeof v === "number") return v;
	const s = v.trim();
	if (s === "" || s === "적설없음" || s === "-" || s === "0") return 0;
	if (s === "1cm 미만" || s === "0.5cm 미만") return 0.3;
	if (s === "5.0cm 이상") return 5;
	const m = s.match(/([\d.]+)/);
	return m ? Number(m[1]) : null;
};

const parseNumeric = (v: string | number): number | null => {
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (v === "" || v === "-") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

const emptyHourly = (forecastAt: string): ShortTermHourly => ({
	forecastAt,
	tempC: null,
	popPct: null,
	sky: null,
	pty: null,
	windMs: null,
	humidityPct: null,
	rainMm: null,
	snowCm: null,
});

export const normalizeShortTerm = (items: VilageFcstItem[]): NormalizedShortTerm | null => {
	if (items.length === 0) return null;
	const first = items[0];
	const baseAt = kstYmdHmToUtcIso(first.baseDate, first.baseTime);
	const byTime = new Map<string, ShortTermHourly>();
	for (const it of items) {
		const at = kstYmdHmToUtcIso(it.fcstDate, it.fcstTime);
		const row = byTime.get(at) ?? emptyHourly(at);
		switch (it.category) {
			case "TMP":
				row.tempC = parseNumeric(it.fcstValue);
				break;
			case "POP":
				row.popPct = parseNumeric(it.fcstValue);
				break;
			case "SKY":
				row.sky = parseNumeric(it.fcstValue);
				break;
			case "PTY":
				row.pty = parseNumeric(it.fcstValue);
				break;
			case "WSD":
				row.windMs = parseNumeric(it.fcstValue);
				break;
			case "REH":
				row.humidityPct = parseNumeric(it.fcstValue);
				break;
			case "PCP":
				row.rainMm = parsePcp(it.fcstValue);
				break;
			case "SNO":
				row.snowCm = parseSno(it.fcstValue);
				break;
			default:
				break;
		}
		byTime.set(at, row);
	}
	const hourly = Array.from(byTime.values()).sort((a, b) =>
		a.forecastAt.localeCompare(b.forecastAt),
	);
	return { nx: first.nx, ny: first.ny, baseAt, hourly };
};
