import {
	type QueryClient,
	useQuery,
	type UseQueryResult,
} from '@tanstack/react-query';

import { fetchPlanDetail, type PlanDetail } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { INFINITE_CACHE_OPTIONS } from '@/lib/query-cache';

export const planDetailQueryKey = (planId: string) => ['planDetail', planId] as const;

export async function fetchPlanDetailQuery(planId: string): Promise<PlanDetail> {
	const apiOrigin = getApiOrigin();
	if (!apiOrigin) {
		throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');
	}
	const accessToken = await getStoredAccessToken();
	if (!accessToken) {
		throw new Error('UNAUTHENTICATED');
	}
	return fetchPlanDetail(apiOrigin, accessToken, planId);
}

export function seedPlanDetailCache(
	queryClient: QueryClient,
	planId: string,
	data: PlanDetail,
): void {
	queryClient.setQueryData(planDetailQueryKey(planId), data);
}

export function usePlanDetailQuery(planId: string | undefined): UseQueryResult<PlanDetail, Error> {
	return useQuery({
		queryKey: planId ? planDetailQueryKey(planId) : ['planDetail', '__none__'],
		queryFn: () => fetchPlanDetailQuery(planId!),
		enabled: Boolean(planId),
		...INFINITE_CACHE_OPTIONS,
	});
}
