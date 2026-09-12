import { type NextRequest, NextResponse } from "next/server";
import { resolveSearchArea, searchKakaoLocal } from "@/lib/kakao-local-search";

const KAKAO_CATEGORY_API = "https://dapi.kakao.com/v2/local/search/category.json";
const ACCOMMODATION_CODE = "AD5";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const categoryGroupCode = searchParams.get("category_group_code") ?? ACCOMMODATION_CODE;

	const area = resolveSearchArea(searchParams);
	if (!area) {
		return NextResponse.json(
			{ error: "rect (swLng,swLat,neLng,neLat) or x/y/radius is required" },
			{ status: 400 },
		);
	}

	const apiKey = process.env.KAKAO_REST_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 });
	}

	try {
		const outcome = await searchKakaoLocal(
			KAKAO_CATEGORY_API,
			apiKey,
			{ category_group_code: categoryGroupCode },
			area,
		);
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
		console.error("Kakao category API error:", error);
		return NextResponse.json({ error: "Failed to fetch from Kakao Local API" }, { status: 502 });
	}
}
