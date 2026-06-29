import dayjs from "dayjs";

/** YYYY.MM.DD → YYYY-MM-DD (Safari 호환용) */
export function normalizeEventDate(dateStr: string): string {
  return dateStr.replace(/\./g, "-");
}

/** 이벤트 날짜까지 남은 일수. 캘린더 일 기준 diff (자정 직전에도 D-1 유지). */
export function getDaysUntilEvent(dateStr: string): number {
  const normalized = normalizeEventDate(dateStr);
  return dayjs(normalized)
    .startOf("day")
    .diff(dayjs().startOf("day"), "day");
}
