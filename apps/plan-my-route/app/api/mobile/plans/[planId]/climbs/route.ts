import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";
import { parsePlanClimbMarker } from "@/lib/plan-climb-marker";
export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { planId } = await params;
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
	const input = parsePlanClimbMarker(body);
	if (!input)
		return NextResponse.json({ error: "고개 이름과 정상 거리를 확인해 주세요." }, { status: 400 });
	const { data: plan, error } = await supabaseAdmin
		.from("plan")
		.select("id,route:route(user_id,total_distance),stages:stage(end_distance)")
		.eq("id", planId)
		.single();
	if (error || !plan || (plan.route as unknown as { user_id: string })?.user_id !== user.id)
		return NextResponse.json({ error: "Plan not found" }, { status: 404 });
	const route = plan.route as unknown as { total_distance: number | null };
	const ends = (plan.stages as unknown as { end_distance: number | null }[]).map(
		(s) => s.end_distance ?? 0,
	);
	const maxDistance = route.total_distance ?? Math.max(0, ...ends);
	if (input.distance_m > maxDistance)
		return NextResponse.json({ error: "정상이 경로 범위를 벗어났습니다." }, { status: 400 });
	if (input.summit_id) {
		const { data: summit } = await supabaseAdmin
			.from("summit_catalog")
			.select("name")
			.eq("id", input.summit_id)
			.eq("status", "approved")
			.eq("is_official", true)
			.single();
		if (!summit)
			return NextResponse.json({ error: "연결할 고개를 찾지 못했습니다." }, { status: 400 });
		input.name = summit.name;
	}
	const { data: saved, error: saveError } = await supabaseAdmin
		.from("plan_climb_marker")
		.upsert({ plan_id: planId, ...input }, { onConflict: "plan_id,distance_m" })
		.select("id,name,distance_m,summit_id")
		.single();
	if (saveError)
		return NextResponse.json(
			{
				error:
					["42P01", "PGRST205"].includes(saveError.code)
						? "고개 등록 기능의 데이터베이스 업데이트가 필요합니다."
						: "저장하지 못했습니다. 다시 시도해 주세요.",
			},
			{ status: 500 },
		);
	return NextResponse.json(saved);
}
