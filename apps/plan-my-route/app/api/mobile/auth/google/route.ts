import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signMobileAccessToken } from "@/lib/mobile-auth";

// Required env:
// - MOBILE_AUTH_GOOGLE_ID / MOBILE_AUTH_GOOGLE_SECRET (recommended for app-only OAuth app)
// - or AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET as fallback
// Optional: MOBILE_AUTH_GOOGLE_REDIRECT_URIS
type GoogleTokenResponse = {
	access_token?: string;
	scope?: string;
	token_type?: string;
	error?: string;
	error_description?: string;
};

type GoogleUserResponse = {
	sub?: string;
	name?: string | null;
	email?: string | null;
	picture?: string | null;
};

type MobileAuthRequestBody = {
	code?: string;
	codeVerifier?: string;
	redirectUri?: string;
};

type NextAuthUserRow = {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
};

type NextAuthAccountRow = {
	userId: string;
};

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const isAllowedRedirectUri = (redirectUri: string) => {
	const allowlist = (process.env.MOBILE_AUTH_GOOGLE_REDIRECT_URIS ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (allowlist.length === 0) return true;
	return allowlist.includes(redirectUri);
};

const readToken = async ({
	code,
	codeVerifier,
	redirectUri,
}: {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}) => {
	const clientId = process.env.MOBILE_AUTH_GOOGLE_ID ?? process.env.AUTH_GOOGLE_ID;
	const clientSecret =
		process.env.MOBILE_AUTH_GOOGLE_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error(
			"Missing Google OAuth credentials (MOBILE_AUTH_GOOGLE_* or AUTH_GOOGLE_*)",
		);
	}

	const params = new URLSearchParams({
		code,
		code_verifier: codeVerifier,
		redirect_uri: redirectUri,
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "authorization_code",
	});
	const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params.toString(),
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Google token exchange failed (${response.status})`);
	}
	const json = (await response.json()) as GoogleTokenResponse;
	if (!json.access_token) {
		throw new Error(json.error_description ?? json.error ?? "Missing Google access token");
	}
	return {
		accessToken: json.access_token,
		scope: json.scope ?? null,
		tokenType: json.token_type ?? null,
	};
};

const readGoogleUser = async (accessToken: string) => {
	const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(`Google user lookup failed (${response.status})`);
	}
	const user = (await response.json()) as GoogleUserResponse;
	if (!user.sub) {
		throw new Error("Google user id is missing");
	}
	return {
		googleId: user.sub,
		name: user.name ?? null,
		email: user.email ?? null,
		image: user.picture ?? null,
	};
};

const getUserFromGoogleAccount = async (googleId: string): Promise<NextAuthUserRow | null> => {
	const { data: account, error: accountError } = await supabaseAdmin
		.schema("next_auth")
		.from("accounts")
		.select('"userId"')
		.eq("provider", "google")
		.eq("providerAccountId", googleId)
		.maybeSingle<NextAuthAccountRow>();

	if (accountError) throw accountError;
	if (!account) return null;

	const { data: user, error: userError } = await supabaseAdmin
		.schema("next_auth")
		.from("users")
		.select("id, name, email, image")
		.eq("id", account.userId)
		.single<NextAuthUserRow>();
	if (userError) throw userError;
	return user;
};

const findOrCreateUser = async ({
	email,
	name,
	image,
}: {
	email: string | null;
	name: string | null;
	image: string | null;
}) => {
	if (email) {
		const { data: existingByEmail, error: emailLookupError } = await supabaseAdmin
			.schema("next_auth")
			.from("users")
			.select("id, name, email, image")
			.eq("email", email)
			.maybeSingle<NextAuthUserRow>();
		if (emailLookupError) throw emailLookupError;
		if (existingByEmail) return existingByEmail;
	}

	const { data: created, error: createError } = await supabaseAdmin
		.schema("next_auth")
		.from("users")
		.insert({
			email,
			name,
			image,
		})
		.select("id, name, email, image")
		.single<NextAuthUserRow>();
	if (!createError && created) return created;

	if (createError?.code === "23505" && email) {
		const { data: existingByEmail, error: fallbackError } = await supabaseAdmin
			.schema("next_auth")
			.from("users")
			.select("id, name, email, image")
			.eq("email", email)
			.single<NextAuthUserRow>();
		if (fallbackError) throw fallbackError;
		return existingByEmail;
	}

	throw createError ?? new Error("Unable to create next_auth.users row");
};

const ensureGoogleAccountLink = async ({
	userId,
	googleId,
	accessToken,
	scope,
	tokenType,
}: {
	userId: string;
	googleId: string;
	accessToken: string;
	scope: string | null;
	tokenType: string | null;
}) => {
	const { error } = await supabaseAdmin
		.schema("next_auth")
		.from("accounts")
		.insert({
			type: "oauth",
			provider: "google",
			providerAccountId: googleId,
			userId,
			access_token: accessToken,
			scope,
			token_type: tokenType,
		});

	if (!error) return;
	if (error.code === "23505") return;
	throw error;
};

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as MobileAuthRequestBody;
		const code = body.code?.trim();
		const codeVerifier = body.codeVerifier?.trim();
		const redirectUri = body.redirectUri?.trim();

		if (!code || !codeVerifier || !redirectUri) {
			return NextResponse.json(
				{ error: "code, codeVerifier, redirectUri are required" },
				{ status: 400 },
			);
		}
		if (!isAllowedRedirectUri(redirectUri)) {
			return NextResponse.json(
				{ error: "redirectUri is not in MOBILE_AUTH_GOOGLE_REDIRECT_URIS" },
				{ status: 400 },
			);
		}

		const { accessToken, scope, tokenType } = await readToken({
			code,
			codeVerifier,
			redirectUri,
		});
		const googleUser = await readGoogleUser(accessToken);

		let user = await getUserFromGoogleAccount(googleUser.googleId);
		if (!user) {
			user = await findOrCreateUser({
				email: googleUser.email,
				name: googleUser.name,
				image: googleUser.image,
			});
			await ensureGoogleAccountLink({
				userId: user.id,
				googleId: googleUser.googleId,
				accessToken,
				scope,
				tokenType,
			});
		}

		const token = await signMobileAccessToken({
			sub: user.id,
			email: user.email,
			name: user.name,
			image: user.image,
		});

		return NextResponse.json({
			accessToken: token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				image: user.image,
			},
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to authenticate";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
