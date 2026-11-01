import { revalidatePath } from "next/cache";
import { invalidatePublicHome, invalidatePublicEvent } from "@/lib/revalidate-public";
import { NextResponse } from "next/server";

type RevalidateBody = {
  path?: string;
  tag?: string;
};

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Revalidation is not configured" }, { status: 503 });
  }
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const headerSecret = request.headers.get("x-revalidate-secret");
    const token = bearerToken ?? headerSecret;

    if (token !== secret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }
  }

  let body: RevalidateBody = {};
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    // no body or invalid JSON: revalidate home only
  }

  if (body.tag) {
    const match = /^event-([a-z0-9][a-z0-9-]*)$/i.exec(body.tag);
    if (!match) return NextResponse.json({ error: "Invalid event tag" }, { status: 400 });
    invalidatePublicEvent(match[1]);
  }
  if (body.path) {
    if (body.path === "/(public)/[locale]") revalidatePath(body.path, "layout");
    else if (["/", "/en", "/ko"].includes(body.path)) invalidatePublicHome();
    else revalidatePath(body.path.startsWith("/en/") || body.path.startsWith("/ko/")
      ? body.path : `/ko${body.path}`);
  } else if (!body.tag) {
    // 기존 전체 갱신 요청은 인증된 호출에만 허용한다.
    revalidatePath("/(public)/[locale]", "layout");
    revalidatePath("/sitemap.xml");
  }
  return NextResponse.json({ revalidated: true });
}
