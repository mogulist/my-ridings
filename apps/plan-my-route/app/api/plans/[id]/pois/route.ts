import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlanPoiType, type PlanPoiRow } from "@/app/types/planPoi";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId } = await params;
  const gate = await assertPlanOwner(planId, session.user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { data, error } = await supabaseAdmin
    .from("plan_poi")
    .select(SELECT_COLS)
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return NextResponse.json(
        {
          error:
            "plan_poi 테이블이 없습니다. supabase-migration-plan-poi.sql 을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []) as PlanPoiRow[]);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId } = await params;
  const gate = await assertPlanOwner(planId, session.user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  try {
    const body = await request.json();
    const {
      kakao_place_id = null,
      name,
      poi_type,
      memo = null,
      lat,
      lng,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!poi_type || typeof poi_type !== "string" || !isPlanPoiType(poi_type)) {
      return NextResponse.json(
        { error: "valid poi_type is required" },
        { status: 400 },
      );
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      return NextResponse.json(
        { error: "lat and lng must be numbers" },
        { status: 400 },
      );
    }

    const row = {
      plan_id: planId,
      kakao_place_id:
        kakao_place_id != null && kakao_place_id !== ""
          ? String(kakao_place_id)
          : null,
      name: String(name).trim(),
      poi_type,
      memo:
        memo != null && String(memo).trim() !== "" ? String(memo).trim() : null,
      lat: latN,
      lng: lngN,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("plan_poi")
      .insert(row)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return NextResponse.json(
          {
            error:
              "plan_poi 테이블이 없습니다. supabase-migration-plan-poi.sql 을 실행해 주세요.",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    return NextResponse.json(data as PlanPoiRow);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
