import { createClient } from "@/lib/supabase/server";

// 캐시 무효화도 비용을 발생시키므로 서버 액션 자체에서 관리자 권한을 확인한다.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");
  const { data } = await supabase.from("admin_whitelist").select("id").eq("email", user.email).single();
  if (!data) throw new Error("Forbidden");
}
