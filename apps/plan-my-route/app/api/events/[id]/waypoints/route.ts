import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { EventWaypointRow } from "@/app/types/event";
import {
  assertSummitAdmin,
  parseNumber,
  normalizeOptionalText,
  isValidWaypointType,
  WAYPOINT_SELECT_COLS,
} from "../../shared";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { id: eventId } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeOptionalText(body.name);
    const waypointType = body.waypoint_type;
    const lat = parseNumber(body.lat);
    const lng = parseNumber(body.lng);

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!isValidWaypointType(waypointType))
      return NextResponse.json({ error: "invalid waypoint_type" }, { status: 400 });
    if (lat == null || lng == null)
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });

    const elevationM = parseNumber(body.elevation_m);
    const distanceKm = parseNumber(body.distance_from_start_km);
    const cutoffSeconds = parseNumber(body.cutoff_seconds_from_start);
    const orderIndex = parseNumber(body.order_index) ?? 0;

    const row = {
      event_id: eventId,
      name,
      waypoint_type: waypointType,
      lat,
      lng,
      elevation_m: elevationM == null ? null : Math.round(elevationM),
      distance_from_start_km: distanceKm,
      cutoff_seconds_from_start: cutoffSeconds == null ? null : Math.round(cutoffSeconds),
      supplies_available: normalizeOptionalText(body.supplies_available),
      is_mandatory_stop: Boolean(body.is_mandatory_stop),
      memo: normalizeOptionalText(body.memo),
      order_index: Math.round(orderIndex),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("event_waypoint")
      .insert(row)
      .select(WAYPOINT_SELECT_COLS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as EventWaypointRow, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
