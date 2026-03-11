import { createClient } from "@supabase/supabase-js";

// Note: Using Service Role Key means this client bypasses Row Level Security (RLS).
// NEVER expose this client to the browser/client-side.
// It should ONLY be used in server-side API Route Handlers where you manually check authentication using `auth()`.
export const supabaseAdmin = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);
