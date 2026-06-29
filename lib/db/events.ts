/**
 * events 데이터 조회 함수
 * Supabase 필수 (폴백 제거됨)
 */

import { supabase, isSupabaseEnabled } from "../supabase";
import type { Event, EventYearDetail, RaceCategory } from "../types";
import type { EventRow, EventEditionRow, CourseRow } from "../database.types";

// DB Row들을 조합하여 Event 객체로 변환
type EventWithRelations = EventRow & {
  event_editions: (EventEditionRow & {
    courses: CourseRow[];
  })[];
};

function mapRowToEvent(row: EventWithRelations): Event {
  // yearDetails 객체 재구성
  const yearDetails: Record<number, EventYearDetail> = {};

  if (row.event_editions) {
    row.event_editions.forEach((edition) => {
      const COURSE_TYPE_ORDER: Record<string, number> = {
        granfondo: 0,
        mediofondo: 1,
        "challenge-a": 0,
        "challenge-b": 1,
        road: 0,
        mtb: 1,
        single: 0,
        rally: 0,
      };

      const courses: RaceCategory[] =
        (edition.courses?.map((course) => ({
          id: course.course_type,
          name: course.name,
          distance: course.distance,
          elevation: course.elevation,
          registered: course.registered_count,
          officialSiteUrl: course.official_site_url?.trim() || undefined,
          stravaUrl: course.strava_url?.trim() || undefined,
          rideWithGpsUrl: course.ride_with_gps_url?.trim() || undefined,
          gpxBlobUrl: course.gpx_blob_url?.trim() || undefined,
          hasKom: course.has_kom === true,
        })) || []).sort(
          (a, b) =>
            (COURSE_TYPE_ORDER[a.id] ?? 99) - (COURSE_TYPE_ORDER[b.id] ?? 99)
        );

      yearDetails[edition.year] = {
        year: edition.year,
        date: edition.date.replace(/-/g, "."), // YYYY-MM-DD -> YYYY.MM.DD
        status: edition.status as any,
        url: edition.url || undefined,
        recordsBlobUrl: edition.records_blob_url || undefined,
        sortedRecordsBlobUrl: edition.sorted_records_blob_url || undefined,
        komRecordsBlobUrl: edition.kom_records_blob_url || undefined,
        komSortedRecordsBlobUrl: edition.kom_sorted_records_blob_url || undefined,
        notice: edition.notice || undefined,
        courses: courses,
        totalRegistered: courses.reduce(
          (sum, c) => sum + (c.registered || 0),
          0
        ),
      };
    });
  }

  return {
    id: row.slug, // 프론트엔드 id는 slug를 사용
    location: row.location,
    name: row.name,
    years: row.event_editions?.map((e) => e.year).sort((a, b) => a - b) || [],
    color: {
      from: row.color_from,
      to: row.color_to,
    },
    status: "ready", // 기본값 (개별 연도 상태 참조)
    meta: {
      title: row.meta_title,
      description: row.meta_description,
      image: row.meta_image,
    },
    comment: row.comment || undefined,
    yearDetails: yearDetails,
  };
}

/**
 * 모든 이벤트 조회
 * @returns Event[] - 이벤트 배열
 */
export async function getAllEvents(): Promise<Event[]> {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error(
      "[events] Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요."
    );
  }

  // 3중 조인 쿼리
  const { data, error } = await supabase
    .from("events")
    .select("*, event_editions(*, courses(*))");

  if (error) {
    throw new Error(`[events] Supabase 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn("[events] DB에 이벤트 데이터가 없습니다.");
    return [];
  }

  console.log(`[events] ✅ Supabase에서 ${data.length}개 이벤트 로드`);
  // @ts-ignore: Supabase 조인 타입 추론 한계로 인해 무시 (실제 런타임 데이터 구조는 맞음)
  return data.map((row) => mapRowToEvent(row as EventWithRelations));
}

/**
 * ID(Slug)로 단일 이벤트 조회
 * @param eventSlug - 이벤트 ID (slug, 예: muju)
 * @returns Event | undefined
 */
export async function getEventById(
  eventSlug: string
): Promise<Event | undefined> {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error(
      `[events] Supabase가 설정되지 않았습니다. "${eventSlug}" 조회 불가.`
    );
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "*, event_editions(id, year, date, status, url, records_blob_url, sorted_records_blob_url, kom_records_blob_url, kom_sorted_records_blob_url, comment, notice, created_at, updated_at, event_id, courses(*))"
    )
    .eq("slug", eventSlug) // id 대신 slug로 조회
    .single();

  if (error) {
    console.error(
      `[events] "${eventSlug}" 조회 실패:`,
      error.message
    );
    return undefined;
  }

  if (!data) {
    return undefined;
  }

  console.log(`[events] ✅ Supabase에서 "${eventSlug}" 로드`);
  // @ts-ignore
  return mapRowToEvent(data as EventWithRelations);
}
