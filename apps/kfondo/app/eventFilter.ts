import dayjs from "dayjs";
import { getAllEvents } from "@/lib/db/events";
import type { EventData } from "@/components/EventCard";
import type { Event, EventYearDetail } from "@/lib/types";
import { getDaysUntilEvent } from "@/lib/date";
import { getTotalParticipantCountForYear } from "@/lib/participant-records-blob";

function yearDetailHasPublishedRecords(detail: EventYearDetail | undefined): boolean {
  if (!detail) return false;
  return (
    (detail.totalRegistered ?? 0) > 0 ||
    Boolean(detail.recordsBlobUrl?.trim()) ||
    Boolean(detail.sortedRecordsBlobUrl?.trim())
  );
}

// Helper to map raw event to EventCard props
export const mapToEventData = (event: Event): EventData => {
  const latestYear = Math.max(...event.years);
  const latestDetail = event.yearDetails[latestYear];

  return {
    id: event.id,
    name: event.name || `${event.location} 그란폰도`,
    status: "archive",
    date: latestDetail.date,
    years: event.years
      .filter((year) => {
        const d = event.yearDetails[year];
        if (!d) return false;
        if (d.status !== "upcoming") return true;
        return yearDetailHasPublishedRecords(d);
      })
      .map(String),
    categories: latestDetail.courses.map((course) => ({
      name: course.name,
      distance: course.distance,
      elevation: course.elevation,
    })),
    updatedAt: latestDetail.date,
    participants: undefined,
    dDay: getDaysUntilEvent(latestDetail.date),
  };
};

const SPLIT_THRESHOLD = 6;
const RECENT_WITH_RECORD_DAYS = 14;
const UPCOMING_WITHOUT_RECORD_DAYS = 7;

type UpcomingCarousel = { title: string; events: EventData[] };

function getMonthKey(dateStr: string): number {
  const normalized = dateStr.replace(/\./g, '-');
  return dayjs(normalized).month();
}

function getDayOfMonth(dateStr: string): number {
  const normalized = dateStr.replace(/\./g, '-');
  return dayjs(normalized).date();
}

function formatMonthLabel(month: number): string {
  return `${month + 1}월`;
}

// 같은 달 안에서 이벤트가 몰려 쪼갠 구간의 제목 (예: "10월 1~9일")
function formatMonthDayRangeLabel(month: number, monthEvents: EventData[]): string {
  const days = monthEvents.map((e) => getDayOfMonth(e.date));
  const minDay = Math.min(...days);
  const maxDay = Math.max(...days);
  const dayRange = minDay === maxDay ? `${minDay}일` : `${minDay}~${maxDay}일`;
  return `${formatMonthLabel(month)} ${dayRange}`;
}

export function splitUpcomingCarousels(events: EventData[]): UpcomingCarousel[] {
  if (events.length === 0) return [];
  if (events.length < SPLIT_THRESHOLD) {
    return [{ title: "다가오는 대회", events }];
  }

  // 월 단위로만 그룹을 나눈다 (month: 0=1월, 1=2월, ...).
  // 인접한 달끼리 섞지 않아, 각 캐로셀이 항상 정확히 하나의 달(또는 그 달의 일부)만 나타낸다.
  const monthMap = new Map<number, EventData[]>();
  for (const event of events) {
    const month = getMonthKey(event.date);
    const list = monthMap.get(month) ?? [];
    list.push(event);
    monthMap.set(month, list);
  }

  const sortedMonths = [...monthMap.keys()].sort((a, b) => a - b);
  const carousels: UpcomingCarousel[] = [];

  for (const month of sortedMonths) {
    const monthEvents = monthMap.get(month)!;

    if (monthEvents.length <= SPLIT_THRESHOLD) {
      carousels.push({
        title: `다가오는 대회 (${formatMonthLabel(month)})`,
        events: monthEvents,
      });
      continue;
    }

    // 한 달에 이벤트가 너무 많으면 날짜 순으로 균등하게 나눠 초순/하순 캐로셀로 분산한다.
    const chunkCount = Math.ceil(monthEvents.length / SPLIT_THRESHOLD);
    const chunkSize = Math.ceil(monthEvents.length / chunkCount);
    for (let i = 0; i < monthEvents.length; i += chunkSize) {
      const chunkEvents = monthEvents.slice(i, i + chunkSize);
      carousels.push({
        title: `다가오는 대회 (${formatMonthDayRangeLabel(month, chunkEvents)})`,
        events: chunkEvents,
      });
    }
  }

  return carousels;
}

// Server-side event filtering logic (no search - client filters)
export async function getFilteredEvents(): Promise<HomePageFilteredData> {
  const events = await getAllEvents();
  const currentYear = dayjs().year();
  const today = dayjs();

  // 에디션/코스가 모두 삭제된 이벤트(years 없음 또는 yearDetails 없음) 제외
  const eventsWithDetails = events.filter((e) => {
    if (e.years.length === 0) return false;
    const latestYear = Math.max(...e.years);
    const detail = e.yearDetails[latestYear];
    return detail?.date != null;
  });

  // Sort events first by latest year's date desc (default sort)
  const sortedEvents = [...eventsWithDetails].sort((a, b) => {
    const aLatestYear = Math.max(...a.years);
    const bLatestYear = Math.max(...b.years);
    const aDate = dayjs(a.yearDetails[aLatestYear].date);
    const bDate = dayjs(b.yearDetails[bLatestYear].date);
    return bDate.valueOf() - aDate.valueOf();
  });

  // Filter groups
  const recentEvents: typeof events = [];
  const upcomingEvents: typeof events = [];
  const otherEventsTemp: typeof events = [];

  sortedEvents.forEach(event => {
    const latestYear = Math.max(...event.years);
    const latestDetail = event.yearDetails[latestYear];
    
    // Normalize date format for Safari (YYYY.MM.DD -> YYYY-MM-DD)
    const normalizedDate = latestDetail.date.replace(/\./g, '-');
    const eventDate = dayjs(normalizedDate);
    
    // Check if it's this year
    if (latestYear === currentYear) {
      if (latestDetail.status === "cancelled") {
        otherEventsTemp.push(event);
        return;
      }
      const daysSince = today
        .startOf("day")
        .diff(eventDate.startOf("day"), "day");
      const hasRecords = yearDetailHasPublishedRecords(latestDetail);

      if (
        hasRecords &&
        daysSince >= 0 &&
        daysSince <= RECENT_WITH_RECORD_DAYS
      ) {
        recentEvents.push(event);
        return;
      }

      if (!hasRecords && daysSince <= UPCOMING_WITHOUT_RECORD_DAYS) {
        upcomingEvents.push(event);
        return;
      }
    }

    // Default to other
    otherEventsTemp.push(event);
  });

  // Sort groups with safer date access
  recentEvents.sort((a, b) => {
    const aYear = a.yearDetails[currentYear] ? currentYear : Math.max(...a.years);
    const bYear = b.yearDetails[currentYear] ? currentYear : Math.max(...b.years);
    const aDateStr = a.yearDetails[aYear].date.replace(/\./g, '-');
    const bDateStr = b.yearDetails[bYear].date.replace(/\./g, '-');
    const aDate = dayjs(aDateStr);
    const bDate = dayjs(bDateStr);
    return bDate.valueOf() - aDate.valueOf();
  });

  upcomingEvents.sort((a, b) => {
    const aYear = a.yearDetails[currentYear] ? currentYear : Math.max(...a.years);
    const bYear = b.yearDetails[currentYear] ? currentYear : Math.max(...b.years);
    const aDateStr = a.yearDetails[aYear].date.replace(/\./g, '-');
    const bDateStr = b.yearDetails[bYear].date.replace(/\./g, '-');
    const aDate = dayjs(aDateStr);
    const bDate = dayjs(bDateStr);
    return aDate.valueOf() - bDate.valueOf();
  });

  const recentData = await Promise.all(
    recentEvents.map(async (e) => {
      const data = mapToEventData(e);
      data.status = "recently_updated";
      const latestYear = Math.max(...e.years);
      const detail = e.yearDetails[latestYear];
      if (detail.recordsBlobUrl?.trim()) {
        const total = await getTotalParticipantCountForYear(e, latestYear);
        if (total > 0) data.participants = total;
      }
      return data;
    })
  );

  const upcomingData = upcomingEvents.map(e => {
    const data = mapToEventData(e);
    data.status = 'upcoming';
    return data;
  });

  const upcomingCarousels = splitUpcomingCarousels(upcomingData);

  return {
    recentEvents: recentData,
    upcomingCarousels,
    otherEvents: otherEventsTemp,
    showSections: recentEvents.length > 0 || upcomingCarousels.length > 0,
  };
}

export type HomePageFilteredData = {
  recentEvents: EventData[];
  upcomingCarousels: { title: string; events: EventData[] }[];
  otherEvents: Event[];
  showSections: boolean;
};

function matchesSearch(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

export function filterEventDataBySearch(
  events: EventData[],
  searchQuery: string
): EventData[] {
  if (!searchQuery?.trim()) return events;
  const query = searchQuery.trim().toLowerCase();
  return events.filter(
    (e) => matchesSearch(e.name, query) || matchesSearch(e.id, query)
  );
}

export function filterRawEventsBySearch(
  events: Event[],
  searchQuery: string
): Event[] {
  if (!searchQuery?.trim()) return events;
  const query = searchQuery.trim().toLowerCase();
  return events.filter((e) => {
    const name = e.name || `${e.location} 그란폰도`;
    return matchesSearch(name, query) || matchesSearch(e.id, query);
  });
}

export function filterHomePageDataBySearch(
  data: HomePageFilteredData,
  searchQuery: string
): HomePageFilteredData {
  if (!searchQuery?.trim()) return data;

  const filteredRecent = filterEventDataBySearch(data.recentEvents, searchQuery);
  const filteredUpcomingCarousels = data.upcomingCarousels
    .map((c) => ({
      ...c,
      events: filterEventDataBySearch(c.events, searchQuery),
    }))
    .filter((c) => c.events.length > 0);
  const filteredOther = filterRawEventsBySearch(data.otherEvents, searchQuery);

  return {
    recentEvents: filteredRecent,
    upcomingCarousels: filteredUpcomingCarousels,
    otherEvents: filteredOther,
    showSections: data.showSections,
  };
}

