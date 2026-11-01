import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { needsSessionRefresh } from "@/lib/supabase/session-refresh";

// 레이아웃과 페이지가 같은 요청에서 인증을 중복 호출하지 않는다.
export const getAdminSession = cache(async () => {
  const cookieStore = await cookies();
  if (await needsSessionRefresh(cookieStore.getAll(), process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
    return { needsRefresh: true, supabase: null, user: null } as const;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { needsRefresh: false, supabase, user } as const;
});
