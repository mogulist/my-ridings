import {
	parseBearerToken,
	toAuthenticatedUser,
	type AuthenticatedUser,
} from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export type { AuthenticatedUser };

export const getAuthenticatedUser = async (
	request: Request,
): Promise<AuthenticatedUser | null> => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) return toAuthenticatedUser(user);

	const bearer = parseBearerToken(request);
	if (!bearer) return null;

	const {
		data: { user: bearerUser },
		error,
	} = await supabaseAdmin.auth.getUser(bearer);
	if (error || !bearerUser) return null;

	return toAuthenticatedUser(bearerUser);
};
