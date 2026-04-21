/**
 * 중기예보 발표 시각(tmFc) — 보통 06:00·18:00(KST). 현재 KST 기준 가장 최근 사용 가능 회차.
 *
 * 발표 후 API 반영까지 약 10분 소요 → 각 회차 정각이 지나도 10분 미만이면
 * 이전 회차를 반환해 미반영 데이터를 참조하는 것을 방지.
 * (Vercel Cron은 :10분 기준이므로 배포 환경에서는 자연히 안전하나,
 * 로컬 수동 호출 시에도 일관되게 동작하기 위해 가드 포함.)
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
	const min = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
	const ymd = `${y}${mo}${d}`;
	// 18:10 KST 이상 → 당일 18:00 회차
	if (hh > 18 || (hh === 18 && min >= 10)) return `${ymd}1800`;
	// 06:10 KST 이상 → 당일 06:00 회차
	if (hh > 6 || (hh === 6 && min >= 10)) return `${ymd}0600`;
	// 06:10 미만 → 전일 18:00 회차
	const prev = shiftYmd(ymd, -1);
	return `${prev}1800`;
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
