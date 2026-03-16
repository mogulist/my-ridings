import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
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
		.eq("user_id", session.user.id)
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
	const session = await auth();
	if (!session?.user?.id) {
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

		const { data, error } = await supabaseAdmin
			.from("route")
			.update(updatePayload)
			.eq("id", id)
			.eq("user_id", session.user.id)
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	const { error } = await supabaseAdmin
		.from("route")
		.delete()
		.eq("id", id)
		.eq("user_id", session.user.id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ message: "Deleted successfully" });
}
