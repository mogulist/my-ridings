// 개발 전용: 기존 Supabase 사용자로 진짜 세션을 발급해 브라우저에 쿠키를 심는다.
// OAuth 화면을 거치지 않고 로컬에서 화면을 확인하기 위한 것이고, 프로덕션에서는 404다.
//
// 인증을 우회하지 않는다. 발급되는 것은 평범한 Supabase 세션이라 RLS와 권한 검사는
// 그대로 적용된다. 쿠키를 직접 조립하지 않고 verifyOtp를 쓰는 이유는 /auth/callback이
// exchangeCodeForSession으로 타는 경로와 같게 두어 @supabase/ssr의 쿠키 포맷을
// 흉내 내지 않기 위해서다.

import { NextResponse } from "next/server";
import { normalizeCallbackPath } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const USERS_PER_PAGE = 200;
const MAX_USER_PAGES = 10;

function notFound() {
	return new NextResponse("Not found", { status: 404 });
}

/** listUsers에는 이메일 필터가 없어서 페이지를 훑는다. */
async function findUserIdByEmail(email: string): Promise<string | null> {
	const needle = email.trim().toLowerCase();
	for (let page = 1; page <= MAX_USER_PAGES; page++) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({
			page,
			perPage: USERS_PER_PAGE,
		});
		if (error) throw new Error(error.message);
		const hit = data.users.find((user) => user.email?.toLowerCase() === needle);
		if (hit) return hit.id;
		if (data.users.length < USERS_PER_PAGE) return null;
	}
	return null;
}

export async function GET(request: Request) {
	if (process.env.NODE_ENV === "production") return notFound();

	const url = new URL(request.url);
	const devSecret = process.env.DEV_AUTH_SECRET;
	if (!devSecret || url.searchParams.get("secret") !== devSecret) return notFound();

	const email = url.searchParams.get("email") ?? process.env.DEV_AUTH_EMAIL;
	if (!email) {
		return new NextResponse("?email=<이메일> 을 주거나 DEV_AUTH_EMAIL을 설정하세요", {
			status: 400,
		});
	}

	// generateLink는 해당 이메일의 사용자가 없으면 조용히 새로 만든다. 오타 하나로
	// 계정이 생기는 것을 막으려고 기존 사용자를 먼저 확인하고, 없으면 여기서 끝낸다.
	let userId: string | null;
	try {
		userId = await findUserIdByEmail(email);
	} catch (error) {
		return new NextResponse(`사용자 조회 실패: ${(error as Error).message}`, { status: 502 });
	}
	if (!userId) {
		return new NextResponse(
			`${email} 사용자가 없습니다. 이 라우트는 계정을 새로 만들지 않습니다.`,
			{ status: 404 },
		);
	}

	const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
		type: "magiclink",
		email,
	});
	if (linkError || !link?.properties?.hashed_token) {
		return new NextResponse(`링크 생성 실패: ${linkError?.message ?? "hashed_token 없음"}`, {
			status: 502,
		});
	}

	const supabase = await createClient();
	const { error: verifyError } = await supabase.auth.verifyOtp({
		type: "magiclink",
		token_hash: link.properties.hashed_token,
	});
	if (verifyError) {
		return new NextResponse(`세션 발급 실패: ${verifyError.message}`, { status: 502 });
	}

	const redirect = normalizeCallbackPath(url.searchParams.get("redirect"));
	return NextResponse.redirect(new URL(redirect, url.origin));
}
