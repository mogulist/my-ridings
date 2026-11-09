import type { EventYearDetail } from "./types";

export function hasOnlyKomRecords(detail: EventYearDetail | undefined): boolean {
  return Boolean(
    detail?.komRecordsBlobUrl?.trim() &&
      detail.komSortedRecordsBlobUrl?.trim() &&
      !detail.recordsBlobUrl?.trim() &&
      !detail.sortedRecordsBlobUrl?.trim(),
  );
}

export function courseHasOnlyKomRecords(
  detail: EventYearDetail | undefined,
  courseId: string,
): boolean {
  return (
    hasOnlyKomRecords(detail) &&
    detail?.courses.some((course) => course.id === courseId && course.hasKom === true) === true
  );
}
