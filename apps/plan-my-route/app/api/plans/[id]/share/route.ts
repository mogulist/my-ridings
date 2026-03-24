import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

type ShareRequestBody = {
	enabled?: boolean;
};

type PlanOwnerLookup = {
	public_share_token: string | null;
	route: {
		user_id: string;
	};
};

type PlanShareRow = {
	public_share_token: string | null;
	shared_at: string | null;
};

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const json = (await request.json()) as ShareRequestBody;
		if (typeof json.enabled !== "boolean") {
			return NextResponse.json(
				{ error: "enabled(boolean) is required" },
				{ status: 400 }
			);
		}

		const { data: planData, error: planError } = await supabaseAdmin
			.from("plan")
			.select("public_share_token, route!inner(user_id)")
			.eq("id", id)
			.single();

		const owner = planData as PlanOwnerLookup | null;
		if (planError || !owner || owner.route.user_id !== session.user.id) {
			return NextResponse.json(
				{ error: "Unauthorized or Plan not found" },
				{ status: 403 }
			);
		}

		const now = new Date().toISOString();
		const nextShareToken = owner.public_share_token ?? crypto.randomUUID();
		const updatePayload: Record<string, string | null> = json.enabled
			? {
					public_share_token: nextShareToken,
					shared_at: now,
				}
			: {
					public_share_token: null,
					shared_at: null,
				};

		const { data, error } = await supabaseAdmin
			.from("plan")
			.update(updatePayload)
			.eq("id", id)
			.select("public_share_token, shared_at")
			.single();

		if (error) throw error;

		const shareData = data as PlanShareRow;
		return NextResponse.json({
			enabled: Boolean(shareData.public_share_token),
			public_share_token: shareData.public_share_token,
			shared_at: shareData.shared_at,
			sharePath: shareData.public_share_token
				? `/share/${shareData.public_share_token}`
				: null,
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
