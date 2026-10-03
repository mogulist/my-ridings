import { normalizeEventDate } from "@/lib/date";
export function formatEventDate(value: string, locale: string): string {
  const normalized = normalizeEventDate(value).replace(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ko-KR", {
    year: "numeric",
    month: locale === "en" ? "short" : "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${normalized}T00:00:00+09:00`));
}
