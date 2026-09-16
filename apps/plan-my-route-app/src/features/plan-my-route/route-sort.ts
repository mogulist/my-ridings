import type { RouteItem } from "@/features/api/plan-my-route";

export function sortRoutesNewestFirst(routes: RouteItem[]): RouteItem[] {
	return [...routes].sort((a, b) => routeCreatedAt(b) - routeCreatedAt(a));
}

function routeCreatedAt(route: RouteItem): number {
	const timestamp = route.created_at ? Date.parse(route.created_at) : Number.NaN;
	return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}
