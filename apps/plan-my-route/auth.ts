import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [
		GitHub({
			profile(profile) {
				console.log("[auth-debug] GitHub Profile returned:", profile);
				return {
					id: profile.id?.toString() ?? "unknown-id",
					name: profile.name ?? profile.login,
					email: profile.email,
					image: profile.avatar_url,
				};
			}
		})
	],
	adapter: SupabaseAdapter({
		url: process.env.SUPABASE_URL!,
		secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
	}),
	trustHost: true,
});
