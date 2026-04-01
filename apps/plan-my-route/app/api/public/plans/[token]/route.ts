import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { PlanPoiRow } from "@/app/types/planPoi";

type PublicPlanStage = {
  id: string;
  title: string | null;
  start_distance: number | null;
  end_distance: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
  memo: string | null;
};

type PublicPlanRouteForClient = {
  name: string;
  rwgps_url: string;
  total_distance: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
};

type PublicPlanRouteRow = PublicPlanRouteForClient & { user_id: string };

type PublicPlanRow = {
  id: string;
  name: string;
  start_date: string | null;
  public_share_token: string;
  shared_at: string | null;
  route: PublicPlanRouteRow;
  stages: PublicPlanStage[];
};

const UUID_V4_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || !UUID_V4_LIKE_REGEX.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("plan")
    .select(
      `
			id,
			name,
			start_date,
			public_share_token,
			shared_at,
			route:route (
				name,
				rwgps_url,
				total_distance,
				elevation_gain,
				elevation_loss,
				user_id
			),
			stages:stage (
				id,
				title,
				start_distance,
				end_distance,
				elevation_gain,
				elevation_loss,
				memo
			)
		`,
    )
    .eq("public_share_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const publicPlan = data as unknown as PublicPlanRow;
  const sortedStages = [...(publicPlan.stages ?? [])].sort(
    (a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0),
  );

  const routeRow = publicPlan.route;
  let authorNickname: string | null = null;
  if (routeRow.user_id) {
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("user_profile")
      .select("nickname")
      .eq("user_id", routeRow.user_id)
      .maybeSingle();
    if (!profileError && profileRow?.nickname) {
      const t = profileRow.nickname.trim();
      authorNickname = t || null;
    }
  }

  const routeForClient: PublicPlanRouteForClient = {
    name: routeRow.name,
    rwgps_url: routeRow.rwgps_url,
    total_distance: routeRow.total_distance,
    elevation_gain: routeRow.elevation_gain,
    elevation_loss: routeRow.elevation_loss,
  };

  let planPois: PlanPoiRow[] = [];
  const { data: poiRows, error: poiError } = await supabaseAdmin
    .from("plan_poi")
    .select(
      "id, plan_id, kakao_place_id, name, poi_type, memo, lat, lng, created_at, updated_at",
    )
    .eq("plan_id", publicPlan.id)
    .order("created_at", { ascending: true });

  if (!poiError && poiRows) {
    planPois = poiRows as PlanPoiRow[];
  }

  return NextResponse.json({
    plan: {
      id: publicPlan.id,
      name: publicPlan.name,
      start_date: publicPlan.start_date,
      public_share_token: publicPlan.public_share_token,
      shared_at: publicPlan.shared_at,
    },
    route: routeForClient,
    stages: sortedStages,
    plan_pois: planPois,
    author: { nickname: authorNickname },
  });
}
