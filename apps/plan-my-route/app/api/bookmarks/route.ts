import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

type BookmarkRow = {
  id: string;
  place_id: string;
  place_name: string;
  place_url: string | null;
  address_name: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isBookmarkSchemaError(error: SupabaseLikeError | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookmark")
    .select("id, place_id, place_name, place_url, address_name, lat, lng, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isBookmarkSchemaError(error))
      return NextResponse.json(
        {
          error:
            "bookmark 테이블이 없습니다. supabase-migration-bookmark.sql 을 먼저 실행해 주세요.",
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
    } = body;

    if (!place_id || !place_name) {
      return NextResponse.json(
        { error: "place_id and place_name are required" },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("bookmark")
      .select("id, place_id, place_name, place_url, address_name, lat, lng, created_at")
      .eq("user_id", session.user.id)
      .eq("place_id", String(place_id))
      .maybeSingle();

    if (existingError) {
      if (isBookmarkSchemaError(existingError))
        return NextResponse.json(
          {
            error:
              "bookmark 테이블이 없습니다. supabase-migration-bookmark.sql 을 먼저 실행해 주세요.",
            code: existingError.code ?? null,
            detail: existingError.message ?? null,
          },
          { status: 503 },
        );
      throw existingError;
    }

    if (existing) return NextResponse.json(existing, { status: 200 });

    const { data, error } = await supabaseAdmin
      .from("bookmark")
      .insert({
        user_id: session.user.id,
        place_id: String(place_id),
        place_name: String(place_name),
        place_url: place_url ?? null,
        address_name: address_name ?? null,
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
      })
      .select()
      .single();

    if (error) {
      if (isBookmarkSchemaError(error))
        return NextResponse.json(
          {
            error:
              "bookmark 테이블이 없습니다. supabase-migration-bookmark.sql 을 먼저 실행해 주세요.",
            code: error.code ?? null,
            detail: error.message ?? null,
          },
          { status: 503 },
        );
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add bookmark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
