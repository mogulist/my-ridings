const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 플랜 시작일 + 일차 → `M.D(요)` 형식 (한국어 요일) */
export function stageDayLabel(
	dayNumber: number,
	planStartDate: string | null | undefined,
): string {
	if (!planStartDate) return "";
	const start = new Date(`${planStartDate}T12:00:00`);
	if (Number.isNaN(start.getTime())) return "";
	const d = new Date(start);
	d.setDate(d.getDate() + (dayNumber - 1));
	const m = d.getMonth() + 1;
	const day = d.getDate();
	const w = WEEKDAY_LABELS[d.getDay()];
	return `${m}.${day}(${w})`;
}
