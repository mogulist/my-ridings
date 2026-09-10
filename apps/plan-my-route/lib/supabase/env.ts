export const getSupabaseUrl = () =>
	getRequiredEnvironmentVariable(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

export const getSupabaseAnonKey = () =>
	getRequiredEnvironmentVariable(
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY",
	);

function getRequiredEnvironmentVariable(value: string | undefined, name: string): string {
	if (value) return value;
	throw new Error(`${name} 환경변수가 필요합니다.`);
}
