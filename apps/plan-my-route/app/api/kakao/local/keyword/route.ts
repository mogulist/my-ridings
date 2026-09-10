import { type NextRequest, NextResponse } from "next/server";

const KAKAO_KEYWORD_API = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PAGE_SIZE = 15;
/** 카카오 로컬은 total_count가 얼마든 pageable_count를 45로 제한한다. */
const KAKAO_MAX_PAGEABLE = 45;
const MAX_PAGES = Math.ceil(KAKAO_MAX_PAGEABLE / PAGE_SIZE);

export type KakaoKeywordPlaceDocument = {
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

export type KakaoKeywordResponse = {
	meta: { total_count: number; pageable_count: number; is_end: boolean };
	documents: KakaoKeywordPlaceDocument[];
};

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const rect = searchParams.get("rect");
	const x = searchParams.get("x");
	const y = searchParams.get("y");
	const radius = searchParams.get("radius");
	const query = searchParams.get("query")?.trim();

	const isRadiusSearch = Boolean(x && y && radius);
	if (!rect && !isRadiusSearch) {
		return NextResponse.json(
			{ error: "rect (swLng,swLat,neLng,neLat) or x/y/radius is required" },
			{ status: 400 },
		);
	}
	if (!query) {
		return NextResponse.json({ error: "query is required" }, { status: 400 });
	}

	const apiKey = process.env.KAKAO_REST_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 });
	}

	const allDocuments: KakaoKeywordPlaceDocument[] = [];
	let page = 1;
	let isEnd = false;
	let totalCount = 0;

	while (!isEnd && page <= MAX_PAGES) {
		const params = new URLSearchParams({
			query,
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

		const res = await fetch(`${KAKAO_KEYWORD_API}?${params}`, {
			headers: {
				Authorization: `KakaoAK ${apiKey}`,
			},
			next: { revalidate: 300 },
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error("Kakao keyword API error:", res.status, errText);
			return NextResponse.json({ error: "Failed to fetch from Kakao Local API" }, { status: 502 });
		}

		const data = (await res.json()) as KakaoKeywordResponse;
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
