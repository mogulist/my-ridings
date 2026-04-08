import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";

const NICKNAME_MAX = 40;

export async function GET(request: Request) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("user_profile")
		.select("nickname")
		.eq("user_id", user.id)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const nickname = data?.nickname?.trim() || null;
	return NextResponse.json({ nickname });
}

export async function PATCH(request: Request) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!body || typeof body !== "object" || !("nickname" in body)) {
		return NextResponse.json(
			{ error: "nickname 필드가 필요합니다." },
			{ status: 400 },
		);
	}

	const raw = (body as { nickname: unknown }).nickname;
	if (raw !== null && raw !== undefined && typeof raw !== "string") {
		return NextResponse.json(
			{ error: "nickname은 문자열이거나 null이어야 합니다." },
			{ status: 400 },
		);
	}

	let nickname: string | null = null;
	if (typeof raw === "string") {
		const t = raw.trim();
		if (t.length > NICKNAME_MAX) {
			return NextResponse.json(
				{ error: `닉네임은 ${NICKNAME_MAX}자 이하입니다.` },
				{ status: 400 },
			);
		}
		nickname = t || null;
	}

	const { error } = await supabaseAdmin.from("user_profile").upsert(
		{
			user_id: user.id,
			nickname,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ nickname });
}
