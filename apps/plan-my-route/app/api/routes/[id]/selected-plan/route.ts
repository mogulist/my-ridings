import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await getAuthenticatedUser(request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id: routeId } = await params;
	const body = (await request.json().catch(() => null)) as { planId?: unknown } | null;
	const planId = body?.planId;
	if (planId !== null && typeof planId !== "string") {
		return NextResponse.json({ error: "planId must be a string or null" }, { status: 400 });
	}

	const { data: route, error: routeError } = await supabaseAdmin
		.from("route")
		.select("id")
		.eq("id", routeId)
		.eq("user_id", user.id)
		.single();
	if (routeError || !route) {
		return NextResponse.json({ error: "Route not found" }, { status: 404 });
	}

	if (typeof planId === "string") {
		const { data: plan, error: planError } = await supabaseAdmin
			.from("plan")
			.select("id")
			.eq("id", planId)
			.eq("route_id", routeId)
			.single();
		if (planError || !plan) {
			return NextResponse.json({ error: "Plan does not belong to this route" }, { status: 400 });
		}
	}

	const { error: updateError } = await supabaseAdmin
		.from("route")
		.update({ selected_plan_id: planId, updated_at: new Date().toISOString() })
		.eq("id", routeId)
		.eq("user_id", user.id);
	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	return NextResponse.json({ selectedPlanId: planId });
}
