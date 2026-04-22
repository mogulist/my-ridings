import * as SecureStore from "expo-secure-store";

export const ACCESS_TOKEN_KEY = "plan-my-route-access-token";
export const GOOGLE_AUTH_PATH = "/api/mobile/auth/google";
export const GITHUB_AUTH_PATH = "/api/mobile/auth/github";
export const GOOGLE_REDIRECT_URI_FALLBACK =
	"https://plan-my-route.vercel.app/api/mobile/oauth/google/callback";
export const GITHUB_REDIRECT_URI_FALLBACK =
	"https://plan-my-route.vercel.app/api/mobile/oauth/github/callback";

export const getApiOrigin = () => {
	const raw = process.env.EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN ?? "";
	return raw.trim().replace(/\/+$/, "");
};

export const getGoogleRedirectUri = () => {
	const raw = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI ?? "";
	return raw.trim();
};

export const getGithubRedirectUri = () => {
	const raw = process.env.EXPO_PUBLIC_GITHUB_OAUTH_REDIRECT_URI ?? "";
	return raw.trim();
};

export const getStoredAccessToken = async () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const setStoredAccessToken = async (token: string) =>
	SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const clearStoredAccessToken = async () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
