import { afterEach, describe, expect, test } from "bun:test";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
	process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
});

describe("Supabase 환경변수", () => {
	test("URL이 없으면 명확한 오류를 반환한다", () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;

		expect(() => getSupabaseUrl()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
	});

	test("publishable key와 anon key가 모두 없으면 명확한 오류를 반환한다", () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

		expect(() => getSupabaseAnonKey()).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
	});
});
