import { NextRequest, NextResponse } from "next/server";

const KAKAO_CATEGORY_API =
  "https://dapi.kakao.com/v2/local/search/category.json";
const ACCOMMODATION_CODE = "AD5";
const PAGE_SIZE = 15;
/** 카카오 로컬은 total_count가 얼마든 pageable_count를 45로 제한한다. */
const KAKAO_MAX_PAGEABLE = 45;
const MAX_PAGES = Math.ceil(KAKAO_MAX_PAGEABLE / PAGE_SIZE);

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
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const radius = searchParams.get("radius");
  const categoryGroupCode = searchParams.get("category_group_code") ?? ACCOMMODATION_CODE;

  const isRadiusSearch = Boolean(x && y && radius);
  if (!rect && !isRadiusSearch) {
    return NextResponse.json(
      { error: "rect (swLng,swLat,neLng,neLat) or x/y/radius is required" },
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
  let totalCount = 0;

  while (!isEnd && page <= MAX_PAGES) {
    const params = new URLSearchParams({
      category_group_code: categoryGroupCode,
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (isRadiusSearch) {
      // 거리순 정렬이면 45개 캡에 걸려도 가까운 곳부터 남는다.
      params.set("x", x as string);
      params.set("y", y as string);
      params.set("radius", radius as string);
      params.set("sort", "distance");
    } else {
      params.set("rect", rect as string);
    }

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
    if (page === 1) totalCount = data.meta.total_count;
    allDocuments.push(...data.documents);
    isEnd = data.meta.is_end;
    page += 1;
  }

  return NextResponse.json({
    meta: {
      total_count: totalCount,
      fetched_count: allDocuments.length,
      is_truncated: totalCount > allDocuments.length,
    },
    documents: allDocuments,
  });
}
