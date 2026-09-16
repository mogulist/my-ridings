import { NextResponse } from "next/server";
import { normalizeScheduleMarkerMemos } from "@/app/types/scheduleMarkerMemos";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { parsePlanReviewNote } from "@/lib/plan-review-note";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const json = await request.json();
		const { name, start_date, review_note, schedule_marker_memos } = json;

		const { data: planData, error: planError } = await supabaseAdmin
			.from("plan")
			.select("route!inner(user_id)")
			.eq("id", id)
			.single();

		if (planError || (planData as any).route.user_id !== user.id) {
			return NextResponse.json({ error: "Unauthorized or Plan not found" }, { status: 403 });
		}

		const updatePayload: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};
		if (name !== undefined) updatePayload.name = name;
		if (start_date !== undefined)
			updatePayload.start_date = start_date === null || start_date === "" ? null : start_date;
		if (review_note !== undefined) {
			const parsedReviewNote = parsePlanReviewNote(review_note);
			if (!parsedReviewNote.ok) {
				return NextResponse.json({ error: parsedReviewNote.error }, { status: 400 });
			}
			updatePayload.review_note = parsedReviewNote.value;
		}
		if (schedule_marker_memos !== undefined) {
			const normalized = normalizeScheduleMarkerMemos(schedule_marker_memos);
			updatePayload.schedule_marker_memos = normalized ?? null;
		}

		const { data, error } = await supabaseAdmin
			.from("plan")
			.update(updatePayload)
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const { data: planData, error: planError } = await supabaseAdmin
			.from("plan")
			.select("route!inner(user_id)")
			.eq("id", id)
			.single();

		if (planError || (planData as any).route.user_id !== user.id) {
			return NextResponse.json({ error: "Unauthorized or Plan not found" }, { status: 403 });
		}

		const { error } = await supabaseAdmin.from("plan").delete().eq("id", id);

		if (error) throw error;

		return NextResponse.json({ message: "Deleted successfully" });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
