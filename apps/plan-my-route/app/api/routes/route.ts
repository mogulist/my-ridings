import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { data, error } = await supabaseAdmin
			.from("route")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error: any) {
		console.error("Top-level GET /api/routes error:", error);
		return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const json = await request.json();
		const {
			name,
			rwgps_url,
			total_distance,
			elevation_gain,
			elevation_loss,
			smoothing_param,
		} = json;

		if (!name || !rwgps_url) {
			return NextResponse.json(
				{ error: "Name and RideWithGPS URL are required" },
				{ status: 400 }
			);
		}

		const { data, error } = await supabaseAdmin
			.from("route")
			.insert({
				user_id: user.id,
				name,
				rwgps_url,
				total_distance,
				elevation_gain,
				elevation_loss,
				smoothing_param,
			})
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error: any) {
		console.error("Top-level POST /api/routes error:", error);
		return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
	}
}
