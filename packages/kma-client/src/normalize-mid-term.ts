import type { MidLandItem, MidTaItem } from "./mid-term-schema";

/** tmFc "YYYYMMDDHHmm" (KST) → UTC ISO */
export const kstTmFcToUtcIso = (tmFc: string): string => {
	if (!/^\d{12}$/.test(tmFc)) throw new Error(`invalid tmFc: ${tmFc}`);
	const y = Number(tmFc.slice(0, 4));
	const m = Number(tmFc.slice(4, 6));
	const d = Number(tmFc.slice(6, 8));
	const hh = Number(tmFc.slice(8, 10));
	const mm = Number(tmFc.slice(10, 12));
	const kstMs = Date.UTC(y, m - 1, d, hh, mm, 0) - 9 * 60 * 60 * 1000;
	return new Date(kstMs).toISOString();
};

export type MidTermDay = {
	/** D+N (3~10) */
	dayOffset: number;
	tmn: number | null;
	tmx: number | null;
	amSky: string | null;
	pmSky: string | null;
	amPop: number | null;
	pmPop: number | null;
};

export type NormalizedMidTerm = {
	regLandCode: string;
	regTempCode: string;
	baseAt: string;
	days: MidTermDay[];
};

const numOrNull = (v: unknown): number | null => {
	if (v == null) return null;
	if (typeof v === "number") return Number.isFinite(v) ? v : null;
	if (typeof v === "string") {
		if (v === "" || v === "-") return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
};

const strOrNull = (v: unknown): string | null => {
	if (v == null) return null;
	if (typeof v === "string") return v === "" ? null : v;
	return String(v);
};

export const normalizeMidTerm = (args: {
	land: MidLandItem | undefined;
	ta: MidTaItem | undefined;
	regLandCode: string;
	regTempCode: string;
	/** tmFc "YYYYMMDDHHmm" (KST). 발표시각. */
	tmFc: string;
}): NormalizedMidTerm => {
	const { land, ta, regLandCode, regTempCode, tmFc } = args;
	const baseAt = kstTmFcToUtcIso(tmFc);
	const days: MidTermDay[] = [];
	for (let n = 3; n <= 10; n += 1) {
		const amPop = numOrNull(land?.[`rnSt${n}Am`] ?? land?.[`rnSt${n}`]);
		const pmPop = numOrNull(land?.[`rnSt${n}Pm`] ?? land?.[`rnSt${n}`]);
		const amSky = strOrNull(land?.[`wf${n}Am`] ?? land?.[`wf${n}`]);
		const pmSky = strOrNull(land?.[`wf${n}Pm`] ?? land?.[`wf${n}`]);
		const tmn = numOrNull(ta?.[`taMin${n}`]);
		const tmx = numOrNull(ta?.[`taMax${n}`]);
		days.push({ dayOffset: n, tmn, tmx, amSky, pmSky, amPop, pmPop });
	}
	return { regLandCode, regTempCode, baseAt, days };
};
