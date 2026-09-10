import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export const createClient = () =>
	createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
