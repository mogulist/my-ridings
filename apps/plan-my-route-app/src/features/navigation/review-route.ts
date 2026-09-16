const PLAN_REVIEW_ROUTE =
	/^\/routes\/([^/]+)\/plans\/([^/]+)\/(summary|schedule|map|stages\/([1-9]\d*))\/?$/;

export function normalizePlanReviewRoute(pathname: string): string | null {
	const match = pathname.match(PLAN_REVIEW_ROUTE);
	if (!match) return null;

	const [, routeId, planId, screen] = match;
	if (!routeId || !planId || !screen) return null;

	return `/routes/${routeId}/plans/${planId}/${screen}`;
}
