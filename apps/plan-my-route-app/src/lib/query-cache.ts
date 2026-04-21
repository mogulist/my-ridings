/** 리스트·상세 조회를 세션 동안 캐시. 새로고침은 refetch로만. */
export const INFINITE_CACHE_OPTIONS = {
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: Number.POSITIVE_INFINITY,
} as const;
