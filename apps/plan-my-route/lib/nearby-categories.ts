import type { NearbyCategoryId } from "@/app/components/KakaoMap/nearbyCategoryId";

/**
 * 카테고리별 카카오 검색 방식. 서버(구간 스캔)와 클라이언트가 같은 정의를 봐야
 * 캐시에 쌓인 것과 즉석 검색 결과가 어긋나지 않는다.
 */
export type NearbyCategorySearch = {
	id: NearbyCategoryId;
	/** 카테고리 그룹 코드로 검색하는 경우 */
	categoryGroupCode?: string;
	/** 키워드로 검색하는 경우 (마트처럼 그룹 코드가 없는 것) */
	keywordQueries?: string[];
};

export const NEARBY_CATEGORY_SEARCHES: NearbyCategorySearch[] = [
	{ id: "restaurant", categoryGroupCode: "FD6" },
	{ id: "cafe", categoryGroupCode: "CE7" },
	{ id: "convenience", categoryGroupCode: "CS2" },
	{ id: "mart", keywordQueries: ["마트"] },
	{ id: "accommodation", categoryGroupCode: "AD5" },
];

export function findNearbyCategorySearch(id: string): NearbyCategorySearch | null {
	return NEARBY_CATEGORY_SEARCHES.find((entry) => entry.id === id) ?? null;
}
