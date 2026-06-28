import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { EventWaypointRow } from "@/app/types/event";
import {
  assertSummitAdmin,
  parseNumber,
  normalizeOptionalText,
  isValidWaypointType,
  WAYPOINT_SELECT_COLS,
} from "../../../shared";

type Params = { params: Promise<{ id: string; waypointId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const gate = await assertSummitAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { waypointId } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = normalizeOptionalText(body.name);
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      patch.name = name;
    }
    if (body.waypoint_type !== undefined) {
      if (!isValidWaypointType(body.waypoint_type))
        return NextResponse.json({ error: "invalid waypoint_type" }, { status: 400 });
      patch.waypoint_type = body.waypoint_type;
    }
    if (body.lat !== undefined) patch.lat = parseNumber(body.lat);
    if (body.lng !== undefined) patch.lng = parseNumber(body.lng);
    if (body.elevation_m !== undefined) {
      const v = parseNumber(body.elevation_m);
      patch.elevation_m = v == null ? null : Math.round(v);
    }
    if (body.distance_from_start_km !== undefined)
      patch.distance_from_start_km = parseNumber(body.distance_from_start_km);
    if (body.cutoff_seconds_from_start !== undefined) {
      const v = parseNumber(body.cutoff_seconds_from_start);
      patch.cutoff_seconds_from_start = v == null ? null : Math.round(v);
    }
    if (body.supplies_available !== undefined)
      patch.supplies_available = normalizeOptionalText(body.supplies_available);
    if (body.is_mandatory_stop !== undefined)
      patch.is_mandatory_stop = Boolean(body.is_mandatory_stop);
    if (body.memo !== undefined) patch.memo = normalizeOptionalText(body.memo);
    if (body.order_index !== undefined) {
      const v = parseNumber(body.order_index);
      if (v != null) patch.order_index = Math.round(v);
    }

    const { data, error } = await supabaseAdmin
      .from("event_waypoint")
      .update(patch)
      .eq("id", waypointId)
      .select(WAYPOINT_SELECT_COLS)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data as EventWaypointRow);
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

  const { waypointId } = await params;
  const { error } = await supabaseAdmin.from("event_waypoint").delete().eq("id", waypointId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
