import type {
  EventRow,
  EventEditionRow,
  CourseRow,
} from "@/lib/database.types";

export type EventEditionWithCourses = EventEditionRow & {
  courses: CourseRow[];
};

export type EventWithEditions = EventRow & {
  event_editions: EventEditionWithCourses[];
};

export const EDITION_STATUS_LABELS: Record<EventEditionRow["status"], string> =
  {
    upcoming: "예정",
    completed: "종료",
    ready: "준비",
    preparing: "준비중",
    cancelled: "취소",
  };

export function formatEditionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}
