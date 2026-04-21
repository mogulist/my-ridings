import {
	type QueryClient,
	useQuery,
	type UseQueryResult,
} from '@tanstack/react-query';

import { fetchRouteDetail, type RouteDetail } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';

export const routeDetailQueryKey = (routeId: string) => ['routeDetail', routeId] as const;

export async function fetchRouteDetailQuery(routeId: string): Promise<RouteDetail> {
	const apiOrigin = getApiOrigin();
	if (!apiOrigin) {
		throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');
	}
	const accessToken = await getStoredAccessToken();
	if (!accessToken) {
		throw new Error('UNAUTHENTICATED');
	}
	return fetchRouteDetail(apiOrigin, accessToken, routeId);
}

export function seedRouteDetailCache(
	queryClient: QueryClient,
	routeId: string,
	data: RouteDetail,
): void {
	queryClient.setQueryData(routeDetailQueryKey(routeId), data);
}

const ROUTE_DETAIL_CACHE = {
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: Number.POSITIVE_INFINITY,
} as const;

export function useRouteDetailQuery(routeId: string | undefined): UseQueryResult<RouteDetail, Error> {
	return useQuery({
		queryKey: routeId ? routeDetailQueryKey(routeId) : ['routeDetail', '__none__'],
		queryFn: () => fetchRouteDetailQuery(routeId!),
		enabled: Boolean(routeId),
		staleTime: ROUTE_DETAIL_CACHE.staleTime,
		gcTime: ROUTE_DETAIL_CACHE.gcTime,
	});
}
