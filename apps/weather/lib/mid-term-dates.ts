/** tmFc `YYYYMMDDHHmm` 의 KST 날짜(YYYYMMDD) + `dayOffset` 일. */
export const forecastYmdFromTmFc = (tmFc: string, dayOffset: number): string => {
	const base = tmFc.slice(0, 8);
	const y = Number(base.slice(0, 4));
	const mo = Number(base.slice(4, 6)) - 1;
	const d = Number(base.slice(6, 8));
	const t = Date.UTC(y, mo, d + dayOffset);
	const dt = new Date(t);
	const yyyy = String(dt.getUTCFullYear());
	const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(dt.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};
