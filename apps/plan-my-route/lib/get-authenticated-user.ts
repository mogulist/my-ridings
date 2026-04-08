import { auth } from "@/auth";
import { verifyMobileAccessToken } from "@/lib/mobile-auth";

export type AuthenticatedUser = {
	id: string;
	email: string | null;
	name: string | null;
	image: string | null;
};

const parseBearerToken = (request: Request) => {
	const raw = request.headers.get("authorization");
	if (!raw) return null;
	const [scheme, token] = raw.split(" ");
	if (!scheme || !token) return null;
	if (scheme.toLowerCase() !== "bearer") return null;
	return token.trim();
};

export const getAuthenticatedUser = async (
	request: Request,
): Promise<AuthenticatedUser | null> => {
	const session = await auth();
	if (session?.user?.id) {
		return {
			id: session.user.id,
			email: session.user.email ?? null,
			name: session.user.name ?? null,
			image: session.user.image ?? null,
		};
	}

	const bearer = parseBearerToken(request);
	if (!bearer) return null;

	try {
		const claims = await verifyMobileAccessToken(bearer);
		return {
			id: claims.sub,
			email: claims.email ?? null,
			name: claims.name ?? null,
			image: claims.image ?? null,
		};
	} catch {
		return null;
	}
};
