import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminReturnPath } from "@/lib/supabase/session-refresh";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const { error } = await supabase.auth.refreshSession();
  const destination = error ? "/admin/login" : adminReturnPath(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
