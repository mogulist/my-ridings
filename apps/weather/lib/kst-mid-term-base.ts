/**
 * 중기예보 발표 시각(tmFc) — 보통 06시·18시(KST). 가장 최근 발표 시각 문자열.
 */
export const latestMidTermTmFcKst = (now = new Date()): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(now);
	const y = parts.find((p) => p.type === "year")?.value ?? "1970";
	const mo = parts.find((p) => p.type === "month")?.value ?? "01";
	const d = parts.find((p) => p.type === "day")?.value ?? "01";
	const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
	const issueHour = hh >= 18 ? 18 : 6;
	if (hh < 6) {
		const prev = shiftYmd(`${y}${mo}${d}`, -1);
		return `${prev}1800`;
	}
	const ymd = `${y}${mo}${d}`;
	if (hh < 18) return `${ymd}0600`;
	return `${ymd}1800`;
};

const shiftYmd = (ymd: string, deltaDays: number): string => {
	const y = Number(ymd.slice(0, 4));
	const mo = Number(ymd.slice(4, 6)) - 1;
	const d = Number(ymd.slice(6, 8));
	const t = Date.UTC(y, mo, d + deltaDays);
	const dt = new Date(t);
	const yyyy = String(dt.getUTCFullYear());
	const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(dt.getUTCDate()).padStart(2, "0");
	return `${yyyy}${mm}${dd}`;
};
