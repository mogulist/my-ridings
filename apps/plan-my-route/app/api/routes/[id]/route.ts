import { after, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { regenerateRouteCoverImages } from "@/lib/route-cover";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	// Fetch route with nested plans and stages
	const { data, error } = await supabaseAdmin
		.from("route")
		.select(`
			*,
			plans:plan (
				*,
				stages:stage (*)
			)
		`)
		.eq("id", id)
		.eq("user_id", user.id)
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}

	// Sort plans by sort_order (nulls last), then by created_at
	const plans = (data as any).plans ?? [];
	plans.sort((a: any, b: any) => {
		const ao = a.sort_order ?? Infinity;
		const bo = b.sort_order ?? Infinity;
		if (ao !== bo) return ao - bo;
		return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
	});
	(data as any).plans = plans;

	return NextResponse.json(data);
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const json = await request.json();
		// Extract allowed fields for update
		const {
			name,
			rwgps_url,
			total_distance,
			elevation_gain,
			elevation_loss,
			smoothing_param,
			start_date,
			official_distance_km,
			official_elevation_m,
			official_start_name,
			official_finish_name,
		} = json;

		const updatePayload: Record<string, any> = {
			name,
			rwgps_url,
			total_distance,
			elevation_gain,
			elevation_loss,
			smoothing_param,
			updated_at: new Date().toISOString(),
		};
		if (start_date !== undefined) {
			updatePayload.start_date = start_date === null || start_date === "" ? null : start_date;
		}
		if (Object.prototype.hasOwnProperty.call(json, "official_distance_km")) {
			updatePayload.official_distance_km =
				official_distance_km == null || official_distance_km === ""
					? null
					: Number(official_distance_km);
		}
		if (Object.prototype.hasOwnProperty.call(json, "official_elevation_m")) {
			const v =
				official_elevation_m == null || official_elevation_m === ""
					? null
					: Number(official_elevation_m);
			updatePayload.official_elevation_m = v == null ? null : Math.round(v);
		}
		if (Object.prototype.hasOwnProperty.call(json, "official_start_name")) {
			updatePayload.official_start_name =
				typeof official_start_name === "string" && official_start_name.trim()
					? official_start_name.trim()
					: null;
		}
		if (Object.prototype.hasOwnProperty.call(json, "official_finish_name")) {
			updatePayload.official_finish_name =
				typeof official_finish_name === "string" && official_finish_name.trim()
					? official_finish_name.trim()
					: null;
		}

		const { data, error } = await supabaseAdmin
			.from("route")
			.update(updatePayload)
			.eq("id", id)
			.eq("user_id", user.id)
			.select()
			.single();

		if (error) throw error;

		if (typeof rwgps_url === "string" && rwgps_url.trim().length > 0) {
			after(async () => {
				try {
					await regenerateRouteCoverImages({
						routeId: data.id,
						rwgpsUrl: rwgps_url,
					});
				} catch (coverError) {
					console.error("Failed to regenerate route cover images:", coverError);
				}
			});
		}

		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	const { error } = await supabaseAdmin
		.from("route")
		.delete()
		.eq("id", id)
		.eq("user_id", user.id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ message: "Deleted successfully" });
}
