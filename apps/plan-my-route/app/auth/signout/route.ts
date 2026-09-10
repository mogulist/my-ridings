import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
	const supabase = await createClient();
	await supabase.auth.signOut();
	return NextResponse.redirect(`${getRedirectBaseUrl(request)}/`);
}
