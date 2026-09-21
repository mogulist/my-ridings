import { type NextRequest, NextResponse } from "next/server";
import {
  isPlanPoiAssignmentMode,
  isPlanPoiBookingMethod,
  isPlanPoiIntent,
  isPlanPoiType,
  type PlanPoiRow,
  safePlanPoiExternalUrl,
} from "@/app/types/planPoi";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

const SELECT_COLS =
  "id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, assignment_mode, stage_id, intent, phone, address_name, place_url, naver_place_url, booking_method, booking_url, booking_checked_at, created_at, updated_at";

async function stageBelongsToPlan(stageId: string, planId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("stage")
    .select("id")
    .eq("id", stageId)
    .eq("plan_id", planId)
    .maybeSingle();
  return Boolean(data);
}

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId } = await params;
  const gate = await assertPlanOwner(planId, user.id);
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
          error: "plan_poi 테이블이 없습니다. supabase-migration-plan-poi.sql 을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as PlanPoiRow[]);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: planId } = await params;
  const gate = await assertPlanOwner(planId, user.id);
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
      assignment_mode = "distance",
      stage_id = null,
      intent = "planned",
      phone = null,
      address_name = null,
      place_url = null,
      naver_place_url = null,
      booking_method = "unconfirmed",
      booking_url = null,
      booking_checked_at = null,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!poi_type || typeof poi_type !== "string" || !isPlanPoiType(poi_type)) {
      return NextResponse.json({ error: "valid poi_type is required" }, { status: 400 });
    }
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 });
    }
    const normalizedAssignmentMode = String(assignment_mode);
    const normalizedIntent = String(intent);
    if (!isPlanPoiAssignmentMode(normalizedAssignmentMode)) {
      return NextResponse.json({ error: "valid assignment_mode is required" }, { status: 400 });
    }
    if (!isPlanPoiIntent(normalizedIntent)) {
      return NextResponse.json({ error: "valid intent is required" }, { status: 400 });
    }
    const normalizedBookingMethod = String(booking_method);
    if (!isPlanPoiBookingMethod(normalizedBookingMethod)) {
      return NextResponse.json({ error: "valid booking_method is required" }, { status: 400 });
    }
    const normalizedBookingUrl = safePlanPoiExternalUrl(
      booking_url != null && String(booking_url).trim() ? String(booking_url).trim() : null,
    );
    if (booking_url != null && String(booking_url).trim() && !normalizedBookingUrl) {
      return NextResponse.json({ error: "booking_url must be an http(s) URL" }, { status: 400 });
    }
    const normalizedNaverPlaceUrl = safePlanPoiExternalUrl(
      naver_place_url != null && String(naver_place_url).trim()
        ? String(naver_place_url).trim()
        : null,
    );
    if (naver_place_url != null && String(naver_place_url).trim() && !normalizedNaverPlaceUrl) {
      return NextResponse.json(
        { error: "naver_place_url must be an http(s) URL" },
        { status: 400 },
      );
    }
    const normalizedBookingCheckedAt = booking_checked_at
      ? new Date(String(booking_checked_at))
      : null;
    if (normalizedBookingCheckedAt && Number.isNaN(normalizedBookingCheckedAt.getTime())) {
      return NextResponse.json(
        { error: "booking_checked_at must be a valid date" },
        { status: 400 },
      );
    }
    const normalizedStageId = stage_id ? String(stage_id) : null;
    if (normalizedAssignmentMode === "stage") {
      if (!normalizedStageId || !(await stageBelongsToPlan(normalizedStageId, planId))) {
        return NextResponse.json({ error: "stage_id must belong to the plan" }, { status: 400 });
      }
    }

    const row = {
      plan_id: planId,
      kakao_place_id:
        kakao_place_id != null && kakao_place_id !== "" ? String(kakao_place_id) : null,
      name: String(name).trim(),
      poi_type,
      memo: memo != null && String(memo).trim() !== "" ? String(memo).trim() : null,
      lat: latN,
      lng: lngN,
      assignment_mode: normalizedAssignmentMode,
      stage_id: normalizedAssignmentMode === "stage" ? normalizedStageId : null,
      intent: normalizedIntent,
      phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
      address_name:
        address_name != null && String(address_name).trim() ? String(address_name).trim() : null,
      place_url: safePlanPoiExternalUrl(
        place_url != null && String(place_url).trim() ? String(place_url).trim() : null,
      ),
      naver_place_url: normalizedNaverPlaceUrl,
      booking_method: normalizedBookingMethod,
      booking_url: normalizedBookingUrl,
      booking_checked_at: normalizedBookingCheckedAt?.toISOString() ?? null,
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
            error: "plan_poi 테이블이 없습니다. supabase-migration-plan-poi.sql 을 실행해 주세요.",
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
