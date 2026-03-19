import { type NextRequest, NextResponse } from "next/server";

const KAKAO_KEYWORD_API = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PAGE_SIZE = 15;

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
	const query = searchParams.get("query")?.trim();

	if (!rect) {
		return NextResponse.json(
			{ error: "rect is required (swLng,swLat,neLng,neLat)" },
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
	const MAX_PAGES = 45;

	while (!isEnd && page <= MAX_PAGES) {
		const params = new URLSearchParams({
			query,
			rect,
			page: String(page),
			size: String(PAGE_SIZE),
		});

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
		allDocuments.push(...data.documents);
		isEnd = data.meta.is_end;
		page += 1;
	}

	return NextResponse.json({
		meta: { total_count: allDocuments.length },
		documents: allDocuments,
	});
}
