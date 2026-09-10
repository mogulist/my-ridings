export const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const getSupabaseAnonKey = () =>
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
