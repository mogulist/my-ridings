import { createClient } from "@supabase/supabase-js";

export function databaseConfigured() {
	return Boolean(
		(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
			(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
	);
}

// Every Boost Data API request explicitly selects its own schema.
export function stravaStore() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Boost database is not configured");
	return createClient(url, key, {
		db: { schema: "strava_boost" },
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
