/**
 * 단기예보 발표 회차(base_time) 중, 현재 KST 시각 기준으로 가장 최근에 발표된 회차.
 * 회차: 02, 05, 08, 11, 14, 17, 20, 23 (매시 정각 기준 이름).
 */
export const latestShortTermBaseKst = (
	now = new Date(),
): { baseDate: string; baseTime: string } => {
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
	const slots = [2, 5, 8, 11, 14, 17, 20, 23];
	let chosen = 23;
	let dayOffset = 0;
	if (hh >= 2) {
		for (const s of slots) {
			if (s <= hh) chosen = s;
		}
	} else {
		chosen = 23;
		dayOffset = -1;
	}
	const baseDate = shiftYmd(`${y}${mo}${d}`, dayOffset);
	const baseTime = `${String(chosen).padStart(2, "0")}00`;
	return { baseDate, baseTime };
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
