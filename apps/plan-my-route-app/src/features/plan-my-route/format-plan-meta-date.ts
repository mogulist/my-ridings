const koDateOnly = new Intl.DateTimeFormat("ko-KR", {
	year: "numeric",
	month: "long",
	day: "numeric",
});

const koDateTime = new Intl.DateTimeFormat("ko-KR", {
	year: "numeric",
	month: "long",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function parseYmd(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]) - 1;
	const d = Number(m[3]);
	const dt = new Date(y, mo, d);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

/** 플랜 카드에 표시할 메타 날짜 (`start_date` 우선, 없으면 `created_at`). */
export function formatPlanMetaDate(
	startDate: string | null | undefined,
	createdAt: string | undefined,
): string {
	if (startDate?.trim()) {
		const dt = parseYmd(startDate);
		if (dt) return koDateOnly.format(dt);
	}
	if (createdAt?.trim()) {
		const ms = Date.parse(createdAt);
		if (!Number.isNaN(ms)) return koDateTime.format(new Date(ms));
	}
	return "";
}
