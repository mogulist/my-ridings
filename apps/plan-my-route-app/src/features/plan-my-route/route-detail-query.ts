import { type QueryClient, type UseQueryResult, useQuery } from "@tanstack/react-query";

import { fetchRouteDetail, type RouteDetail } from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { INFINITE_CACHE_OPTIONS } from "@/lib/query-cache";

export const routeDetailQueryKey = (routeId: string) => ["routeDetail", routeId] as const;

export async function fetchRouteDetailQuery(routeId: string): Promise<RouteDetail> {
	const apiOrigin = getApiOrigin();
	if (!apiOrigin) {
		throw new Error("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
	}
	const accessToken = await getStoredAccessToken();
	if (!accessToken) {
		throw new Error("UNAUTHENTICATED");
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

export function useRouteDetailQuery(
	routeId: string | undefined,
): UseQueryResult<RouteDetail, Error> {
	return useQuery({
		queryKey: routeId ? routeDetailQueryKey(routeId) : ["routeDetail", "__none__"],
		queryFn: () => fetchRouteDetailQuery(routeId!),
		enabled: Boolean(routeId),
		...INFINITE_CACHE_OPTIONS,
	});
}
