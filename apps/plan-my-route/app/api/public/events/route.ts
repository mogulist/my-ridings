import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { EventWithWaypoints } from "@/app/types/event";
import { EVENT_SELECT_COLS, WAYPOINT_SELECT_COLS } from "@/app/api/events/shared";

// GET /api/public/events?name=설악그란폰도&date=2025-05-17
// event.search_keywords 배열에서 name이 포함된 이벤트를 ±1일 날짜 범위로 검색
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const date = searchParams.get("date")?.trim();

  if (!name || !date) {
    return NextResponse.json({ error: "name and date are required" }, { status: 400 });
  }

  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "invalid date format" }, { status: 400 });
  }

  const prevDay = new Date(targetDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // search_keywords 배열에서 name을 포함하는 row를 찾기 위해 ilike로 name 컬럼도 함께 검색
  // PostgreSQL: search_keywords && ARRAY[name] is not directly supported via supabase client,
  // so we fetch candidates by date range and filter by keyword in JS
  const { data, error } = await supabaseAdmin
    .from("event")
    .select(EVENT_SELECT_COLS)
    .eq("is_public", true)
    .gte("event_date", fmt(prevDay))
    .lte("event_date", fmt(nextDay));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nameLower = name.toLowerCase().replace(/\s+/g, "");

  const matched = (data ?? []).find((row) => {
    const keywords: string[] = row.search_keywords ?? [row.name];
    return keywords.some((kw: string) =>
      kw.toLowerCase().replace(/\s+/g, "").includes(nameLower) ||
      nameLower.includes(kw.toLowerCase().replace(/\s+/g, "")),
    );
  });

  if (!matched) {
    return NextResponse.json(null);
  }

  const { data: waypoints, error: wpError } = await supabaseAdmin
    .from("event_waypoint")
    .select(WAYPOINT_SELECT_COLS)
    .eq("event_id", matched.id)
    .order("order_index");

  if (wpError) {
    return NextResponse.json({ error: wpError.message }, { status: 500 });
  }

  return NextResponse.json({ ...matched, waypoints: waypoints ?? [] } as EventWithWaypoints);
}
