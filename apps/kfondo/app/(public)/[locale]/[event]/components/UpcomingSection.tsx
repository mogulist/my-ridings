import { useTranslations, useLocale } from "next-intl";
import type { Event } from "@/lib/types";
import { getDaysUntilEvent, normalizeEventDate } from "@/lib/date";
import dayjs from "dayjs";
import { MapPin } from "lucide-react";
import { DDayCard } from "./DDayCard";
import { CourseCard, hasAnyCourseLink } from "./course-card";

const UPCOMING_WITHOUT_RECORD_DAYS = 7;

type Props = {
  event: Event;
};

export const UpcomingSection = ({ event }: Props) => {
  const t = useTranslations();
  const locale = useLocale();

  const RECORD_PENDING_NOTICE = t("event.recordsPending");
  const RECORD_COLLECTING_NOTICE = t("event.recordsCollecting");
  const latestYear = event.years.length > 0 ? Math.max(...event.years) : null;
  const latestDetail = latestYear != null ? event.yearDetails[latestYear] : undefined;
  const hasDate =
    latestDetail?.date &&
    /^\d{4}[.-]\d{1,2}[.-]\d{1,2}$/.test(latestDetail.date.replace(/\./g, "-"));

  const normalizedDate = latestDetail?.date ? normalizeEventDate(latestDetail.date) : "";
  const dDay = hasDate ? getDaysUntilEvent(latestDetail!.date) : null;
  const isPastEvent = hasDate && dDay !== null && dDay < 0;
  if (isPastEvent) return null;

  const daysSinceEvent =
    hasDate && normalizedDate ? dayjs().diff(dayjs(normalizedDate), "day") : null;
  const hasRecords =
    (latestDetail?.totalRegistered ?? 0) > 0 ||
    Boolean(latestDetail?.recordsBlobUrl?.trim()) ||
    Boolean(latestDetail?.sortedRecordsBlobUrl?.trim());
  const isPreparing = latestDetail?.status === "preparing";
  const showPendingNotice =
    !isPreparing &&
    latestDetail?.status !== "not_collected" &&
    !hasRecords &&
    daysSinceEvent !== null &&
    daysSinceEvent >= 0 &&
    daysSinceEvent <= UPCOMING_WITHOUT_RECORD_DAYS;
  const noticeMessage = isPreparing
    ? RECORD_COLLECTING_NOTICE
    : showPendingNotice
      ? RECORD_PENDING_NOTICE
      : null;
  const dateLabel = hasDate ? formatEventDateLabel(latestDetail!.date, locale) : null;
  const showDDayCard = hasDate && dateLabel && dDay !== null && dDay >= 0;

  const officialSiteUrl = getOfficialSiteUrl(event);
  const latestCourses = latestDetail?.courses?.filter((c) => c.name?.trim()) ?? [];
  const coursesWithLinks = latestCourses.filter(hasAnyCourseLink);
  const hasCourseInfo = coursesWithLinks.length > 0;

  if (!showDDayCard && !noticeMessage && !officialSiteUrl && !hasCourseInfo) return null;

  return (
    <div className="space-y-4">
      {showDDayCard && <DDayCard date={latestDetail!.date} dateLabel={dateLabel!} />}

      {noticeMessage && (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
        </div>
      )}

      {officialSiteUrl && (
        <a
          href={officialSiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:opacity-70 pl-2"
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          {t("event.officialSite")}
        </a>
      )}

      {hasCourseInfo && (
        <section className="space-y-3" role="region" aria-label={t("event.courseInfo")}>
          <h2 className="text-lg font-bold text-foreground pl-1">{t("event.courseInfo")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {coursesWithLinks.map((course) => (
              <CourseCard key={course.id} course={course} eventSlug={event.id} year={latestYear!} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

function getOfficialSiteUrl(event: Event): string | undefined {
  const yearsWithUrl = event.years.filter((y) => event.yearDetails[y]?.url?.trim());
  if (yearsWithUrl.length === 0) return undefined;
  const latestYear = Math.max(...yearsWithUrl);
  return event.yearDetails[latestYear].url!.trim();
}

function formatEventDateLabel(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${normalizeEventDate(dateStr)}T00:00:00+09:00`));
}
