import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPlanPoiType, type PlanPoiRow } from "@/app/types/planPoi";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT_COLS =
  "id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, created_at, updated_at";

async function assertPlanOwner(
  planId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data, error } = await supabaseAdmin
    .from("plan")
    .select("route!inner(user_id)")
    .eq("id", planId)
    .single();

  if (error || !data) {
    return { ok: false, status: 404, message: "Plan not found" };
  }
  const row = data as { route?: { user_id?: string } };
  const routeUserId = row.route?.user_id;
  if (!routeUserId || routeUserId !== userId) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId, poiId } = await params;
  const gate = await assertPlanOwner(planId, session.user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { name, poi_type, memo } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (poi_type !== undefined) {
      if (typeof poi_type !== "string" || !isPlanPoiType(poi_type)) {
        return NextResponse.json(
          { error: "valid poi_type is required" },
          { status: 400 },
        );
      }
      updates.poi_type = poi_type;
    }
    if (memo !== undefined) {
      updates.memo =
        memo != null && String(memo).trim() !== ""
          ? String(memo).trim()
          : null;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "At least one of name, poi_type, memo is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("plan_poi")
      .update(updates)
      .eq("id", poiId)
      .eq("plan_id", planId)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "POI not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as PlanPoiRow);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId, poiId } = await params;
  const gate = await assertPlanOwner(planId, session.user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { error } = await supabaseAdmin
    .from("plan_poi")
    .delete()
    .eq("id", poiId)
    .eq("plan_id", planId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
