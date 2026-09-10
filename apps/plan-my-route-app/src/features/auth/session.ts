import { SUPABASE } from "./supabase-client";

export const getApiOrigin = () => {
	const raw = process.env.EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN ?? "";
	return raw.trim().replace(/\/+$/, "");
};

export const getStoredAccessToken = async () => {
	const { data } = await SUPABASE.auth.getSession();
	return data.session?.access_token ?? null;
};

export const clearStoredAccessToken = async () => {
	await SUPABASE.auth.signOut();
};
