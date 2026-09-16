/** 짧은 화면 이동은 캐시를 쓰고, 포그라운드 복귀 시 오래된 검토 데이터를 갱신한다. */
export const REVIEW_QUERY_OPTIONS = {
	staleTime: 60_000,
	gcTime: Number.POSITIVE_INFINITY,
} as const;
