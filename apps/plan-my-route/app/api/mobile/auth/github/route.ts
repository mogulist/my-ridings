import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signMobileAccessToken } from "@/lib/mobile-auth";

// Required env: AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (optional allowlist: MOBILE_AUTH_GITHUB_REDIRECT_URIS)
type GitHubTokenResponse = {
	access_token?: string;
	scope?: string;
	token_type?: string;
	error?: string;
	error_description?: string;
};

type GitHubUserResponse = {
	id?: number;
	name?: string | null;
	login?: string;
	email?: string | null;
	avatar_url?: string | null;
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

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_USER_ENDPOINT = "https://api.github.com/user";

const isAllowedRedirectUri = (redirectUri: string) => {
	const allowlist = (process.env.MOBILE_AUTH_GITHUB_REDIRECT_URIS ?? "")
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
	const clientId = process.env.AUTH_GITHUB_ID;
	const clientSecret = process.env.AUTH_GITHUB_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("Missing AUTH_GITHUB_ID or AUTH_GITHUB_SECRET");
	}

	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		code,
		code_verifier: codeVerifier,
		redirect_uri: redirectUri,
	});
	const response = await fetch(GITHUB_TOKEN_ENDPOINT, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params.toString(),
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`GitHub token exchange failed (${response.status})`);
	}
	const json = (await response.json()) as GitHubTokenResponse;
	if (!json.access_token) {
		throw new Error(json.error_description ?? json.error ?? "Missing GitHub access token");
	}
	return {
		accessToken: json.access_token,
		scope: json.scope ?? null,
		tokenType: json.token_type ?? null,
	};
};

const readGitHubUser = async (accessToken: string) => {
	const response = await fetch(GITHUB_USER_ENDPOINT, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${accessToken}`,
			"User-Agent": "plan-my-route-mobile-auth",
		},
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(`GitHub user lookup failed (${response.status})`);
	}
	const user = (await response.json()) as GitHubUserResponse;
	if (typeof user.id !== "number") {
		throw new Error("GitHub user id is missing");
	}
	return {
		githubId: String(user.id),
		name: user.name ?? user.login ?? null,
		email: user.email ?? null,
		image: user.avatar_url ?? null,
	};
};

const getUserFromGitHubAccount = async (githubId: string): Promise<NextAuthUserRow | null> => {
	const { data: account, error: accountError } = await supabaseAdmin
		.schema("next_auth")
		.from("accounts")
		.select('"userId"')
		.eq("provider", "github")
		.eq("providerAccountId", githubId)
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

const ensureGitHubAccountLink = async ({
	userId,
	githubId,
	accessToken,
	scope,
	tokenType,
}: {
	userId: string;
	githubId: string;
	accessToken: string;
	scope: string | null;
	tokenType: string | null;
}) => {
	const { error } = await supabaseAdmin
		.schema("next_auth")
		.from("accounts")
		.insert({
			type: "oauth",
			provider: "github",
			providerAccountId: githubId,
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
				{ error: "redirectUri is not in MOBILE_AUTH_GITHUB_REDIRECT_URIS" },
				{ status: 400 },
			);
		}

		const { accessToken, scope, tokenType } = await readToken({
			code,
			codeVerifier,
			redirectUri,
		});
		const githubUser = await readGitHubUser(accessToken);

		let user = await getUserFromGitHubAccount(githubUser.githubId);
		if (!user) {
			user = await findOrCreateUser({
				email: githubUser.email,
				name: githubUser.name,
				image: githubUser.image,
			});
			await ensureGitHubAccountLink({
				userId: user.id,
				githubId: githubUser.githubId,
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
