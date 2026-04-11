import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { regenerateRouteCoverImages } from "@/lib/route-cover";
import { supabaseAdmin } from "@/lib/supabase";

type RouteRow = {
	id: string;
	rwgps_url: string;
};

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const { data: routeRow, error: routeError } = await supabaseAdmin
		.from("route")
		.select("id, rwgps_url")
		.eq("id", id)
		.eq("user_id", user.id)
		.single<RouteRow>();

	if (routeError || !routeRow) {
		return NextResponse.json({ error: "Route not found" }, { status: 404 });
	}

	try {
		const result = await regenerateRouteCoverImages({
			routeId: routeRow.id,
			rwgpsUrl: routeRow.rwgps_url,
		});
		return NextResponse.json(result);
	} catch (error: any) {
		console.error("POST /api/routes/[id]/regenerate-cover error:", error);
		return NextResponse.json(
			{ error: error?.message ?? "Failed to regenerate route cover image" },
			{ status: 500 },
		);
	}
}
