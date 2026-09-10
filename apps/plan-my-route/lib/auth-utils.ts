import type { User } from "@supabase/supabase-js";

export type AuthenticatedUser = {
	id: string;
	email: string | null;
	name: string | null;
	image: string | null;
};

export const parseBearerToken = (request: Request) => {
	const raw = request.headers.get("authorization");
	if (!raw) return null;
	const [scheme, token] = raw.split(" ");
	if (!scheme || !token) return null;
	if (scheme.toLowerCase() !== "bearer") return null;
	return token.trim();
};

export const normalizeCallbackPath = (raw: string | null): string => {
	if (!raw) return "/";
	if (!raw.startsWith("/")) return "/";
	if (raw.startsWith("//")) return "/";
	if (raw.includes("\\")) return "/";
	return raw;
};

export const buildOAuthCallbackUrl = (origin: string, callbackPath: string): string => {
	const callbackUrl = new URL("/auth/callback", origin);
	callbackUrl.searchParams.set("next", callbackPath);
	return callbackUrl.toString();
};

export const toAuthenticatedUser = (user: User): AuthenticatedUser => ({
	id: user.id,
	email: user.email ?? null,
	name:
		(typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
		(typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
		null,
	image:
		(typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) || null,
});
