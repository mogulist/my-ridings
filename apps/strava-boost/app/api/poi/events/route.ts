import { NextRequest, NextResponse } from "next/server";

const PMR_URL = process.env.PLAN_MY_ROUTE_URL ?? "";

// GET /api/poi/events?name=...&date=YYYY-MM-DD
// plan-my-route 서버를 서버사이드에서 호출 (CORS 없음)
export async function GET(request: NextRequest) {
  if (!PMR_URL) {
    return NextResponse.json(null);
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const date = searchParams.get("date");

  if (!name || !date) {
    return NextResponse.json({ error: "name and date are required" }, { status: 400 });
  }

  try {
    const url = new URL("/api/public/events", PMR_URL);
    url.searchParams.set("name", name);
    url.searchParams.set("date", date);

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json(null);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}
