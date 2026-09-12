import { type NextRequest, NextResponse } from "next/server";
import { resolveSearchArea, searchKakaoLocal } from "@/lib/kakao-local-search";

const KAKAO_KEYWORD_API = "https://dapi.kakao.com/v2/local/search/keyword.json";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("query")?.trim();

	const area = resolveSearchArea(searchParams);
	if (!area) {
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

	try {
		const outcome = await searchKakaoLocal(KAKAO_KEYWORD_API, apiKey, { query }, area);
		return NextResponse.json({
			meta: {
				total_count: outcome.totalCount,
				fetched_count: outcome.documents.length,
				is_truncated: outcome.isTruncated,
				request_count: outcome.requestCount,
			},
			documents: outcome.documents,
		});
	} catch (error) {
		console.error("Kakao keyword API error:", error);
		return NextResponse.json({ error: "Failed to fetch from Kakao Local API" }, { status: 502 });
	}
}
