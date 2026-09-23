import type { TrackPoint } from "@my-ridings/plan-geometry";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { fetchNearbyAlongRoute } from "@/lib/nearby-cache";
import {
  fetchRideWithGpsJson,
  parseRwgpsRouteId,
  unwrapRideWithGpsRoute,
} from "@/lib/rwgps-route-json";
import { supabaseAdmin } from "@/lib/supabase";
import { supplyKind, supplySearchCells, supplyStageTrack } from "@/lib/supply-planning";

export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const startKm = Number(query.get("startKm"));
  const endKm = Number(query.get("endKm"));
  const detourM = Number(query.get("detourM"));
  const cursor = Number(query.get("cursor") ?? 0);
  const category = query.get("category") ?? "";
  if (
    !Number.isFinite(startKm) ||
    !Number.isFinite(endKm) ||
    startKm < 0 ||
    endKm <= startKm ||
    ![500, 1000, 3000].includes(detourM) ||
    !Number.isInteger(cursor) ||
    cursor < 0 ||
    !["convenience", "mart"].includes(category ?? "")
  ) {
    return NextResponse.json({ error: "검색 범위가 올바르지 않습니다." }, { status: 400 });
  }
  try {
    const { id } = await params;
    const { data: route, error } = await supabaseAdmin
      .from("route")
      .select("rwgps_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !route)
      return NextResponse.json({ error: "경로를 찾을 수 없습니다." }, { status: 404 });
    const routeId = parseRwgpsRouteId(route.rwgps_url);
    const json = routeId ? await fetchRideWithGpsJson(routeId) : null;
    const track = json ? unwrapRideWithGpsRoute(json) : null;
    const points = supplyStageTrack((track?.track_points ?? []) as TrackPoint[], startKm, endKm);
    if (points.length < 2)
      return NextResponse.json({ error: "스테이지 경로를 불러올 수 없습니다." }, { status: 422 });
    const cells = supplySearchCells(points, detourM);
    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) throw new Error("Missing Kakao key");
    const batch = cells.slice(cursor, cursor + 2);
    const result = await fetchNearbyAlongRoute({
      trackPoints: points,
      categoryId: category,
      cells: batch,
      bounds: { swLat: -90, neLat: 90, swLng: -180, neLng: 180 },
      maxDetourM: detourM,
      kakaoApiKey: apiKey,
    });
    const completed = Math.min(cursor + batch.length, cells.length);
    return NextResponse.json({
      documents: result.documents.map((doc) => ({
        ...doc,
        kind: supplyKind(doc.place_name, category),
      })),
      completed,
      total: cells.length,
      nextCursor: completed < cells.length ? completed : null,
      truncated: result.meta.is_truncated,
    });
  } catch (error) {
    console.error("Supply search failed", error);
    return NextResponse.json(
      { error: "보급소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
