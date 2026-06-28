import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { EventRow, EventWithWaypoints } from "@/app/types/event";
import {
  assertSummitAdmin,
  parseNumber,
  normalizeOptionalText,
  isValidEventType,
  EVENT_SELECT_COLS,
  WAYPOINT_SELECT_COLS,
} from "../shared";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { id } = await params;

  const [eventRes, waypointsRes] = await Promise.all([
    supabaseAdmin.from("event").select(EVENT_SELECT_COLS).eq("id", id).single(),
    supabaseAdmin
      .from("event_waypoint")
      .select(WAYPOINT_SELECT_COLS)
      .eq("event_id", id)
      .order("order_index"),
  ]);

  if (eventRes.error) {
    const status = eventRes.error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: eventRes.error.message }, { status });
  }

  return NextResponse.json({
    ...(eventRes.data as EventRow),
    waypoints: waypointsRes.data ?? [],
  } as EventWithWaypoints);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = normalizeOptionalText(body.name);
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      patch.name = name;
    }
    if (body.description !== undefined) patch.description = normalizeOptionalText(body.description);
    if (body.event_type !== undefined) {
      if (!isValidEventType(body.event_type))
        return NextResponse.json({ error: "invalid event_type" }, { status: 400 });
      patch.event_type = body.event_type;
    }
    if (body.event_date !== undefined) patch.event_date = normalizeOptionalText(body.event_date);
    if (body.official_distance_km !== undefined)
      patch.official_distance_km = parseNumber(body.official_distance_km);
    if (body.official_elevation_m !== undefined) {
      const v = parseNumber(body.official_elevation_m);
      patch.official_elevation_m = v == null ? null : Math.round(v);
    }
    if (body.organizer_name !== undefined)
      patch.organizer_name = normalizeOptionalText(body.organizer_name);
    if (body.organizer_url !== undefined)
      patch.organizer_url = normalizeOptionalText(body.organizer_url);
    if (body.is_public !== undefined) patch.is_public = Boolean(body.is_public);
    if (Array.isArray(body.search_keywords)) {
      patch.search_keywords = (body.search_keywords as unknown[])
        .map((k) => (typeof k === "string" ? k.trim() : null))
        .filter((k): k is string => k !== null && k.length > 0);
    }

    const { data, error } = await supabaseAdmin
      .from("event")
      .update(patch)
      .eq("id", id)
      .select(EVENT_SELECT_COLS)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data as EventRow);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from("event").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
