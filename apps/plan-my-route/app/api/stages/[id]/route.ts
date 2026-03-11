import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
		const { title, start_distance, end_distance } = json;

		// Security check: Verify the stage belongs to a plan connected to a route owned by the user
		const { data: stageData, error: stageError } = await supabaseAdmin
			.from("stage")
			.select("plan!inner(route!inner(user_id))")
			.eq("id", id)
			.single();

		if (
			stageError ||
			(stageData as any).plan.route.user_id !== session.user.id
		) {
			return NextResponse.json(
				{ error: "Unauthorized or Stage not found" },
				{ status: 403 }
			);
		}

		const { data, error } = await supabaseAdmin
			.from("stage")
			.update({
				title,
				start_distance,
				end_distance,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
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

	try {
		const { data: stageData, error: stageError } = await supabaseAdmin
			.from("stage")
			.select("plan!inner(route!inner(user_id))")
			.eq("id", id)
			.single();

		if (
			stageError ||
			(stageData as any).plan.route.user_id !== session.user.id
		) {
			return NextResponse.json(
				{ error: "Unauthorized or Stage not found" },
				{ status: 403 }
			);
		}

		const { error } = await supabaseAdmin
			.from("stage")
			.delete()
			.eq("id", id);

		if (error) throw error;

		return NextResponse.json({ message: "Deleted successfully" });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
