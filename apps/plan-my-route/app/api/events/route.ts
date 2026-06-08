import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { EventRow } from "@/app/types/event";
import {
  assertSummitAdmin,
  parseNumber,
  normalizeOptionalText,
  isValidEventType,
  EVENT_SELECT_COLS,
} from "./shared";

export async function GET(request: Request) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { data, error } = await supabaseAdmin
    .from("event")
    .select(EVENT_SELECT_COLS)
    .order("event_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as EventRow[]);
}

export async function POST(request: NextRequest) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeOptionalText(body.name);
    const eventType = body.event_type;
    const eventDate = normalizeOptionalText(body.event_date);
    const description = normalizeOptionalText(body.description);
    const officialDistanceKm = parseNumber(body.official_distance_km);
    const officialElevationM = parseNumber(body.official_elevation_m);
    const organizerName = normalizeOptionalText(body.organizer_name);
    const organizerUrl = normalizeOptionalText(body.organizer_url);
    const routeId = normalizeOptionalText(body.route_id);
    const isPublic = typeof body.is_public === "boolean" ? body.is_public : true;

    const searchKeywords = Array.isArray(body.search_keywords)
      ? (body.search_keywords as unknown[])
          .map((k) => (typeof k === "string" ? k.trim() : null))
          .filter((k): k is string => k !== null && k.length > 0)
      : [];

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!eventDate) return NextResponse.json({ error: "event_date is required" }, { status: 400 });
    if (!isValidEventType(eventType))
      return NextResponse.json({ error: "invalid event_type" }, { status: 400 });

    const row = {
      name,
      description,
      event_type: eventType,
      event_date: eventDate,
      route_id: routeId,
      official_distance_km: officialDistanceKm,
      official_elevation_m:
        officialElevationM == null ? null : Math.round(officialElevationM),
      search_keywords: searchKeywords.length > 0 ? searchKeywords : null,
      organizer_name: organizerName,
      organizer_url: organizerUrl,
      is_public: isPublic,
      created_by: gate.userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("event")
      .insert(row)
      .select(EVENT_SELECT_COLS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "same event name and date already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as EventRow, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
