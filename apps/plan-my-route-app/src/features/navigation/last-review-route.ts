import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizePlanReviewRoute } from "./review-route";

const STORAGE_KEY = "plan-my-route:last-review-route:v1";

let didClaimInitialRoute = false;

export async function rememberLastReviewRoute(pathname: string): Promise<void> {
	const route = normalizePlanReviewRoute(pathname);
	if (!route) return;
	await AsyncStorage.setItem(STORAGE_KEY, route);
}

/** 앱 프로세스마다 한 번만 복원하여 사용자가 홈으로 이동한 뒤 되돌아가는 것을 막는다. */
export async function claimLastReviewRoute(): Promise<string | null> {
	if (didClaimInitialRoute) return null;
	didClaimInitialRoute = true;

	const stored = await AsyncStorage.getItem(STORAGE_KEY);
	if (!stored) return null;
	return normalizePlanReviewRoute(stored);
}
