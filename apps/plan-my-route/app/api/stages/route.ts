import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const json = await request.json();
		const { plan_id, title, start_distance, end_distance, elevation_gain, elevation_loss, memo } = json;

		if (!plan_id) {
			return NextResponse.json(
				{ error: "Plan ID is required" },
				{ status: 400 }
			);
		}

		// Security check: Verify the plan belongs to a route owned by the user
		const { data: planData, error: planError } = await supabaseAdmin
			.from("plan")
			.select("route!inner(user_id)")
			.eq("id", plan_id)
			.single();

		if (planError || (planData as any).route.user_id !== user.id) {
			return NextResponse.json(
				{ error: "Plan not found or unauthorized" },
				{ status: 403 }
			);
		}

		const { data, error } = await supabaseAdmin
			.from("stage")
			.insert({
				plan_id,
				title,
				start_distance,
				end_distance,
				elevation_gain: elevation_gain ?? null,
				elevation_loss: elevation_loss ?? null,
				memo: memo ?? null,
			})
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json(data, { status: 201 });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
