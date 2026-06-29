// Dev-only: looks up the user by email in Supabase next_auth schema,
// creates a 30-day session, and sets the authjs.session-token cookie.
// Returns 404 in production.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function forbidden() {
	return new NextResponse("Not found", { status: 404 });
}

export async function GET(request: Request) {
	if (process.env.NODE_ENV === "production") return forbidden();

	const url = new URL(request.url);
	const secret = url.searchParams.get("secret");
	const devSecret = process.env.DEV_AUTH_SECRET;
	if (!devSecret || secret !== devSecret) return forbidden();

	const email = url.searchParams.get("email") ?? process.env.DEV_AUTH_EMAIL ?? null;
	if (!email) {
		return new NextResponse("Provide ?email=<email> or set DEV_AUTH_EMAIL env var", {
			status: 400,
		});
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		return new NextResponse("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY", {
			status: 500,
		});
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		db: { schema: "next_auth" },
	});

	// Look up user
	const { data: user, error: userErr } = await supabase
		.from("users")
		.select("id")
		.eq("email", email)
		.single();

	if (userErr || !user) {
		return new NextResponse(`User not found for email ${email}: ${userErr?.message ?? "no row"}`, {
			status: 404,
		});
	}

	// Create a 30-day session
	const sessionToken = randomBytes(32).toString("hex");
	const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

	const { error: sessionErr } = await supabase.from("sessions").insert({
		sessionToken,
		userId: user.id,
		expires,
	});

	if (sessionErr) {
		return new NextResponse(`Failed to create session: ${sessionErr.message}`, {
			status: 500,
		});
	}

	const redirect = url.searchParams.get("redirect") ?? "/";
	const isSecure = new URL(request.url).protocol === "https:";

	const response = NextResponse.redirect(new URL(redirect, request.url));
	response.cookies.set("authjs.session-token", sessionToken, {
		httpOnly: true,
		sameSite: "lax",
		secure: isSecure,
		expires: new Date(expires),
		path: "/",
	});

	return response;
}
