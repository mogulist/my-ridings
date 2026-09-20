import { type NextRequest, NextResponse } from "next/server";
import {
  isPlanPoiAssignmentMode,
  isPlanPoiIntent,
  isPlanPoiType,
  type PlanPoiRow,
} from "@/app/types/planPoi";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT_COLS =
  "id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, assignment_mode, stage_id, intent, phone, address_name, place_url, created_at, updated_at";

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
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId, poiId } = await params;
  const gate = await assertPlanOwner(planId, user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { name, poi_type, memo, assignment_mode, stage_id, intent } = body;

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
        return NextResponse.json({ error: "valid poi_type is required" }, { status: 400 });
      }
      updates.poi_type = poi_type;
    }
    if (memo !== undefined) {
      updates.memo = memo != null && String(memo).trim() !== "" ? String(memo).trim() : null;
    }
    if (assignment_mode !== undefined) {
      if (typeof assignment_mode !== "string" || !isPlanPoiAssignmentMode(assignment_mode)) {
        return NextResponse.json({ error: "valid assignment_mode is required" }, { status: 400 });
      }
      updates.assignment_mode = assignment_mode;
      updates.stage_id = assignment_mode === "stage" ? stage_id : null;
      if (assignment_mode === "stage") {
        if (typeof stage_id !== "string" || !stage_id) {
          return NextResponse.json({ error: "stage_id is required" }, { status: 400 });
        }
        const { data: stage } = await supabaseAdmin
          .from("stage")
          .select("id")
          .eq("id", stage_id)
          .eq("plan_id", planId)
          .maybeSingle();
        if (!stage) {
          return NextResponse.json({ error: "stage_id must belong to the plan" }, { status: 400 });
        }
      }
    }
    if (intent !== undefined) {
      if (typeof intent !== "string" || !isPlanPoiIntent(intent)) {
        return NextResponse.json({ error: "valid intent is required" }, { status: 400 });
      }
      updates.intent = intent;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "At least one editable field is required" },
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
  request: Request,
  { params }: { params: Promise<{ id: string; poiId: string }> },
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId, poiId } = await params;
  const gate = await assertPlanOwner(planId, user.id);
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
