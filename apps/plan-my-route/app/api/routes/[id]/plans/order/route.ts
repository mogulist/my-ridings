import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: routeId } = await params;

	try {
		const json = await request.json();
		const { planIds } = json as { planIds?: string[] };

		if (!Array.isArray(planIds) || planIds.length === 0) {
			return NextResponse.json(
				{ error: "planIds array is required" },
				{ status: 400 }
			);
		}

		const { data: routeData, error: routeError } = await supabaseAdmin
			.from("route")
			.select("id")
			.eq("id", routeId)
			.eq("user_id", user.id)
			.single();

		if (routeError || !routeData) {
			return NextResponse.json(
				{ error: "Route not found or unauthorized" },
				{ status: 403 }
			);
		}

		const updatedAt = new Date().toISOString();
		const updateResults = await Promise.all(
			planIds.map((planId, index) =>
				supabaseAdmin
					.from("plan")
					.update({ sort_order: index, updated_at: updatedAt })
					.eq("id", planId)
					.eq("route_id", routeId)
			)
		);
		const updateError = updateResults.find(({ error }) => error)?.error;

		if (updateError) {
			return NextResponse.json(
				{ error: updateError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
