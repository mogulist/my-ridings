import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
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
			.eq("user_id", session.user.id)
			.single();

		if (routeError || !routeData) {
			return NextResponse.json(
				{ error: "Route not found or unauthorized" },
				{ status: 403 }
			);
		}

		for (let i = 0; i < planIds.length; i++) {
			const { error } = await supabaseAdmin
				.from("plan")
				.update({ sort_order: i, updated_at: new Date().toISOString() })
				.eq("id", planIds[i])
				.eq("route_id", routeId);

			if (error) {
				return NextResponse.json(
					{ error: error.message },
					{ status: 500 }
				);
			}
		}

		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
