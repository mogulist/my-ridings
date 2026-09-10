import { NextResponse } from "next/server";
import { normalizeCallbackPath } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/server";

const getRedirectBaseUrl = (request: Request): string => {
	const isLocalEnv = process.env.NODE_ENV === "development";
	if (isLocalEnv) {
		const { origin } = new URL(request.url);
		return origin;
	}

	const forwardedHost = request.headers.get("x-forwarded-host");
	const forwardedProto = request.headers.get("x-forwarded-proto");
	const host = request.headers.get("host");
	const hostToUse = forwardedHost ?? host;
	if (hostToUse) {
		const proto = forwardedProto ?? "https";
		return `${proto}://${hostToUse}`;
	}

	return process.env.NEXT_PUBLIC_APP_URL ?? "https://plan-my-route.vercel.app";
};

export async function GET(request: Request) {
	const baseUrl = getRedirectBaseUrl(request);
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const next = normalizeCallbackPath(searchParams.get("next"));

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) return NextResponse.redirect(`${baseUrl}${next}`);
	}

	return NextResponse.redirect(`${baseUrl}/signin?error=oauth`);
}
