import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

type RevalidateBody = {
  path?: string;
  tag?: string;
};

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
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
    revalidateTag(body.tag, { expire: 0 });
  }
  if (body.path) {
    if (body.path === "/(public)/[locale]") revalidatePath(body.path, "layout");
    else revalidatePath(body.path);
    if (body.path === "/") {
      revalidatePath("/en");
      revalidatePath("/(public)/[locale]", "layout");
    }
  } else {
    // 전체 revalidate
    revalidatePath("/", "layout");
  }
  return NextResponse.json({ revalidated: true });
}
