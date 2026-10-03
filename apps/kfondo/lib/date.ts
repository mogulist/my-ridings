import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

/** YYYY.MM.DD → YYYY-MM-DD (Safari 호환용) */
export function normalizeEventDate(dateStr: string): string {
  return dateStr
    .replace(/\./g, "-")
    .replace(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
    );
}

/** 이벤트 날짜까지 남은 일수. 캘린더 일 기준 diff (자정 직전에도 D-1 유지). */
export function getDaysUntilEvent(dateStr: string): number {
  const normalized = normalizeEventDate(dateStr);
  return dayjs
    .tz(normalized, "Asia/Seoul")
    .startOf("day")
    .diff(dayjs().tz("Asia/Seoul").startOf("day"), "day");
}
