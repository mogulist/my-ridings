import { NextRequest, NextResponse } from "next/server";

const KAKAO_CATEGORY_API =
  "https://dapi.kakao.com/v2/local/search/category.json";
const ACCOMMODATION_CODE = "AD5";
const PAGE_SIZE = 15;

export type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  place_url: string;
  address_name: string;
  road_address_name?: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  x: string;
  y: string;
  distance?: string;
};

export type KakaoCategoryResponse = {
  meta: { total_count: number; pageable_count: number; is_end: boolean };
  documents: KakaoPlaceDocument[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rect = searchParams.get("rect");
  const categoryGroupCode = searchParams.get("category_group_code") ?? ACCOMMODATION_CODE;

  if (!rect) {
    return NextResponse.json(
      { error: "rect is required (swLng,swLat,neLng,neLat)" },
      { status: 400 },
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const allDocuments: KakaoPlaceDocument[] = [];
  let page = 1;
  let isEnd = false;
  const MAX_PAGES = 45;

  while (!isEnd && page <= MAX_PAGES) {
    const params = new URLSearchParams({
      category_group_code: categoryGroupCode,
      rect,
      page: String(page),
      size: String(PAGE_SIZE),
    });

    const res = await fetch(`${KAKAO_CATEGORY_API}?${params}`, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Kakao category API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch from Kakao Local API" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as KakaoCategoryResponse;
    allDocuments.push(...data.documents);
    isEnd = data.meta.is_end;
    page += 1;
  }

  return NextResponse.json({
    meta: { total_count: allDocuments.length },
    documents: allDocuments,
  });
}
