import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export type ReviewState = "up2" | "up1" | "neutral" | "down";

export type PlaceReviewRow = {
  id: string;
  place_id: string;
  place_name: string;
  place_url: string | null;
  address_name: string | null;
  lat: number | null;
  lng: number | null;
  place_kind: string;
  review_state: ReviewState;
  note: string | null;
  route_id: string | null;
  plan_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isPlaceReviewSchemaError(error: SupabaseLikeError | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return false;
}

const SELECT_COLS =
  "id, place_id, place_name, place_url, address_name, lat, lng, place_kind, review_state, note, route_id, plan_id, stage_id, created_at, updated_at";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("place_review")
    .select(SELECT_COLS)
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isPlaceReviewSchemaError(error))
      return NextResponse.json(
        {
          error:
            "place_review 테이블이 없습니다. supabase-migration-place-review.sql 을 먼저 실행해 주세요.",
          code: error.code ?? null,
          detail: error.message ?? null,
        },
        { status: 503 },
      );
    return NextResponse.json(
      { error: error.message, code: error.code ?? null },
      { status: 500 },
    );
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      place_id,
      place_name,
      place_url,
      address_name,
      lat,
      lng,
      provider = "kakao",
      place_kind = "accommodation",
      review_state = "neutral",
      note,
      route_id,
      plan_id,
      stage_id,
    } = body;

    if (!place_id || !place_name) {
      return NextResponse.json(
        { error: "place_id and place_name are required" },
        { status: 400 },
      );
    }

    const validStates: ReviewState[] = ["up2", "up1", "neutral", "down"];
    const state = validStates.includes(review_state) ? review_state : "neutral";

    const row = {
      user_id: session.user.id,
      provider: String(provider),
      place_id: String(place_id),
      place_name: String(place_name),
      place_url: place_url != null ? String(place_url) : null,
      address_name: address_name != null ? String(address_name) : null,
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
      place_kind: String(place_kind),
      review_state: state,
      note: note != null && note !== "" ? String(note) : null,
      route_id: route_id != null ? String(route_id) : null,
      plan_id: plan_id != null ? String(plan_id) : null,
      stage_id: stage_id != null ? String(stage_id) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("place_review")
      .upsert(row, {
        onConflict: "user_id,provider,place_id",
        ignoreDuplicates: false,
      })
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (isPlaceReviewSchemaError(error))
        return NextResponse.json(
          {
            error:
              "place_review 테이블이 없습니다. supabase-migration-place-review.sql 을 먼저 실행해 주세요.",
            code: error.code ?? null,
            detail: error.message ?? null,
          },
          { status: 503 },
        );
      throw error;
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save place review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
