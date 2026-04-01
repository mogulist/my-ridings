import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
