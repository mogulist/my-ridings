/** 오늘 날짜 YYYY-MM-DD (Asia/Seoul). */
export const kstTodayYmd = (): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const y = parts.find((p) => p.type === "year")?.value;
	const m = parts.find((p) => p.type === "month")?.value;
	const d = parts.find((p) => p.type === "day")?.value;
	if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
	return `${y}-${m}-${d}`;
};

/**
 * KST 달력 기준 `fromYmd` → `toYmd` 일수 (to가 미래면 양수).
 * 예: from=2026-04-22, to=2026-04-26 → 4
 */
export const kstCalendarDaysFrom = (fromYmd: string, toYmd: string): number => {
	const from = new Date(`${fromYmd}T12:00:00+09:00`);
	const to = new Date(`${toYmd}T12:00:00+09:00`);
	return Math.round((to.getTime() - from.getTime()) / 86400000);
};

/** 스테이지 날짜가 오늘(KST)로부터 며칠 뒤인지 (오늘=0). */
export const kstDaysUntil = (targetYmd: string): number => {
	return kstCalendarDaysFrom(kstTodayYmd(), targetYmd);
};

/** targetYmd 당일 06:00~20:59 KST 를 단기 예보 조회 구간으로 (UTC Date). */
export const kstRidingWindowUtc = (targetYmd: string): { from: Date; to: Date } => ({
	from: new Date(`${targetYmd}T06:00:00+09:00`),
	to: new Date(`${targetYmd}T20:59:59.999+09:00`),
});
