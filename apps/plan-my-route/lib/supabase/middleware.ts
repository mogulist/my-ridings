import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export const updateSession = async (request: NextRequest) => {
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet, headers) {
				cookiesToSet.forEach(({ name, value }) => {
					request.cookies.set(name, value);
				});
				supabaseResponse = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) => {
					supabaseResponse.cookies.set(name, value, options);
				});
				Object.entries(headers).forEach(([name, value]) => {
					supabaseResponse.headers.set(name, value);
				});
			},
		},
	});

	await supabase.auth.getClaims();

	return supabaseResponse;
};
