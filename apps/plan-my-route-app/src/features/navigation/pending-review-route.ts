import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizePlanReviewRoute } from "./review-route";
const KEY = "plan-my-route:pending-review:v1";
export async function rememberPendingReviewRoute(path: string) {
	const normalized = normalizePlanReviewRoute(path);
	if (normalized) await AsyncStorage.setItem(KEY, normalized);
}
export async function consumePendingReviewRoute(): Promise<string | null> {
	const raw = await AsyncStorage.getItem(KEY);
	await AsyncStorage.removeItem(KEY);
	return raw ? normalizePlanReviewRoute(raw) : null;
}
