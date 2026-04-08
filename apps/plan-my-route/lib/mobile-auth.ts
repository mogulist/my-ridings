import { SignJWT, jwtVerify } from "jose";

const MOBILE_AUTH_ISSUER = "plan-my-route-mobile-auth";
const MOBILE_AUTH_AUDIENCE = "plan-my-route-api";
const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60 * 12;

export type MobileAccessTokenPayload = {
	sub: string;
	email?: string | null;
	name?: string | null;
	image?: string | null;
};

type JwtClaims = {
	sub: string;
	email?: string;
	name?: string;
	image?: string;
};

const getAuthSecret = () => {
	const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
	if (!secret) {
		throw new Error("Missing AUTH_SECRET (or NEXTAUTH_SECRET)");
	}
	return new TextEncoder().encode(secret);
};

export const signMobileAccessToken = async ({
	sub,
	email,
	name,
	image,
}: MobileAccessTokenPayload) => {
	const now = Math.floor(Date.now() / 1000);
	return await new SignJWT({
		email: email ?? undefined,
		name: name ?? undefined,
		image: image ?? undefined,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(sub)
		.setIssuedAt(now)
		.setNotBefore(now)
		.setIssuer(MOBILE_AUTH_ISSUER)
		.setAudience(MOBILE_AUTH_AUDIENCE)
		.setExpirationTime(now + ACCESS_TOKEN_LIFETIME_SECONDS)
		.sign(getAuthSecret());
};

export const verifyMobileAccessToken = async (token: string): Promise<JwtClaims> => {
	const { payload } = await jwtVerify(token, getAuthSecret(), {
		issuer: MOBILE_AUTH_ISSUER,
		audience: MOBILE_AUTH_AUDIENCE,
	});
	if (!payload.sub || typeof payload.sub !== "string") {
		throw new Error("Invalid token subject");
	}

	return {
		sub: payload.sub,
		email: typeof payload.email === "string" ? payload.email : undefined,
		name: typeof payload.name === "string" ? payload.name : undefined,
		image: typeof payload.image === "string" ? payload.image : undefined,
	};
};
