import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// URL 유효성 검사 함수
const isValidUrl = (url: string): boolean => {
	if (!url || url.trim() === "") return false;
	// placeholder 값 체크
	if (url.includes("your_") || url.includes("placeholder") || url === "your_supabase_url_here") {
		return false;
	}
	// HTTP/HTTPS URL 형식 검사
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
	} catch {
		return false;
	}
};

// Supabase가 설정되지 않은 경우 더미 클라이언트 생성
// 실제 사용 시에는 isSupabaseConfigured()로 확인 후 사용
let supabase: SupabaseClient;

if (
	isValidUrl(supabaseUrl) &&
	supabaseAnonKey &&
	supabaseAnonKey !== "your_supabase_anon_key_here"
) {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
	// 더미 클라이언트 (실제로는 사용되지 않음)
	supabase = createClient("https://placeholder.supabase.co", "placeholder-key");
	console.warn(
		"Supabase 환경 변수가 설정되지 않았거나 유효하지 않습니다. Supabase 기능이 비활성화됩니다.",
	);
}

export { supabase };

export const isSupabaseConfigured = (): boolean => {
	return (
		isValidUrl(supabaseUrl) &&
		supabaseAnonKey !== "" &&
		supabaseAnonKey !== "your_supabase_anon_key_here"
	);
};
