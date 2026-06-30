import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPE = "application/gpx+xml";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 4MB)" },
      { status: 400 }
    );
  }

  const type = file.type?.toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  if (
    type !== ALLOWED_TYPE &&
    !name.endsWith(".gpx") &&
    type !== "application/xml" &&
    type !== "text/xml"
  ) {
    return NextResponse.json(
      { error: "Only GPX files are allowed" },
      { status: 400 }
    );
  }

  const pathname = `courses/${Date.now()}-${crypto.randomUUID()}.gpx`;
  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: "application/gpx+xml",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[gpx-upload]", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
