import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const json = await request.json();
		const { route_id, name } = json;

		if (!route_id || !name) {
			return NextResponse.json(
				{ error: "Route ID and name are required" },
				{ status: 400 }
			);
		}

		// Optional: Verify the route belongs to the user before adding a plan to it
		const { data: routeData, error: routeError } = await supabaseAdmin
			.from("route")
			.select("id")
			.eq("id", route_id)
			.eq("user_id", session.user.id)
			.single();

		if (routeError || !routeData) {
			return NextResponse.json(
				{ error: "Route not found or unauthorized" },
				{ status: 403 }
			);
		}

		const { data, error } = await supabaseAdmin
			.from("plan")
			.insert({
				route_id,
				name,
			})
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json(data, { status: 201 });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
