import type { Event } from "@/lib/types";
import type { Locale } from "./routing";
export function translated(
  original: string | undefined,
  english: string | undefined,
  locale: Locale,
) {
  return locale === "en" && english?.trim() ? english.trim() : original;
}
export function localizeEvent(event: Event, locale: Locale): Event {
  const originalName = event.originalName ?? event.name;
  const originalLocation = event.originalLocation ?? event.location;
  return {
    ...event,
    originalName,
    originalLocation,
    name: translated(originalName, event.nameEn, locale),
    location: translated(originalLocation, event.locationEn, locale) ?? originalLocation,
    comment: translated(event.comment, event.commentEn, locale),
    searchTerms: [originalName, originalLocation, event.nameEn, event.locationEn, event.id].filter(
      (x): x is string => Boolean(x),
    ),
    yearDetails: Object.fromEntries(
      Object.entries(event.yearDetails).map(([year, detail]) => [
        year,
        {
          ...detail,
          comment: translated(detail.comment, detail.commentEn, locale),
          notice: translated(detail.notice, detail.noticeEn, locale),
          courses: detail.courses.map((course) => ({
            ...course,
            originalName: course.originalName ?? course.name,
            name:
              translated(course.originalName ?? course.name, course.nameEn, locale) ?? course.name,
          })),
        },
      ]),
    ),
  };
}
export function eventDisplayName(event: Event, locale: Locale) {
  return event.name || `${event.location} ${locale === "en" ? "Gran Fondo" : "그란폰도"}`;
}
