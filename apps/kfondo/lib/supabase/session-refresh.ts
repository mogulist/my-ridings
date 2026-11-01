import { combineChunks, stringFromBase64URL } from "@supabase/ssr";

/** 쿠키의 만료 정보는 갱신 여부에만 사용한다. 권한은 반드시 Auth 서버에서 검증한다. */
export async function needsSessionRefresh(
  cookies: { name: string; value: string }[],
  supabaseUrl: string,
  now = Date.now(),
) {
  const key = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const raw = await combineChunks(key, (name) => cookies.find((cookie) => cookie.name === name)?.value);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw.startsWith("base64-") ? stringFromBase64URL(raw.slice(7)) : raw);
    if (!session?.refresh_token) return false;
    // SDK가 읽기 전용 Server Component에서 먼저 갱신하지 않도록 여유를 둔다.
    return typeof session.expires_at !== "number" || session.expires_at * 1000 <= now + 5 * 60 * 1000;
  } catch {
    return false;
  }
}

export function adminReturnPath(value: string | null) {
  const origin = "https://admin.kfondo.cc";
  try {
    const url = new URL(value || "/admin", origin);
    if (
      url.origin === origin &&
      (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) &&
      !url.pathname.startsWith("/admin/auth/") &&
      url.pathname !== "/admin/login"
    ) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // 외부 URL이나 잘못된 경로는 관리자 홈으로 돌린다.
  }
  return "/admin";
}
