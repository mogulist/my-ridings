import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { fetchRoutes, type RouteItem } from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { sortRoutesNewestFirst } from "@/features/plan-my-route/route-sort";
import { REVIEW_QUERY_OPTIONS } from "@/lib/query-cache";

export const routeListQueryKey = ["routes"] as const;

export async function fetchRouteListQuery(): Promise<RouteItem[]> {
	const apiOrigin = getApiOrigin();
	if (!apiOrigin) {
		throw new Error("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
	}
	const accessToken = await getStoredAccessToken();
	if (!accessToken) {
		throw new Error("UNAUTHENTICATED");
	}
	return sortRoutesNewestFirst(await fetchRoutes(apiOrigin, accessToken));
}

export function useRouteListQuery(): UseQueryResult<RouteItem[], Error> {
	return useQuery({
		queryKey: routeListQueryKey,
		queryFn: fetchRouteListQuery,
		...REVIEW_QUERY_OPTIONS,
	});
}
