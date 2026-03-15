import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isPlaceReviewSchemaError(error: SupabaseLikeError | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return false;
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ placeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { placeId } = await context.params;
  if (!placeId) {
    return NextResponse.json(
      { error: "placeId is required" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("place_review")
    .delete()
    .eq("user_id", session.user.id)
    .eq("provider", "kakao")
    .eq("place_id", decodeURIComponent(placeId));

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
  return new NextResponse(null, { status: 204 });
}
