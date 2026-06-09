import { NextRequest, NextResponse } from "next/server";

const PMR_URL = process.env.PLAN_MY_ROUTE_URL ?? "";

// GET /api/poi/summits?minLat=...&maxLat=...&minLng=...&maxLng=...
// plan-my-route 서버를 서버사이드에서 호출 (CORS 없음)
export async function GET(request: NextRequest) {
  if (!PMR_URL) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const minLat = searchParams.get("minLat");
  const maxLat = searchParams.get("maxLat");
  const minLng = searchParams.get("minLng");
  const maxLng = searchParams.get("maxLng");

  try {
    const url = new URL("/api/public/summits", PMR_URL);
    if (minLat) url.searchParams.set("minLat", minLat);
    if (maxLat) url.searchParams.set("maxLat", maxLat);
    if (minLng) url.searchParams.set("minLng", minLng);
    if (maxLng) url.searchParams.set("maxLng", maxLng);

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
