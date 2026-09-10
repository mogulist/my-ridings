import { describe, expect, test } from "bun:test";
import {
	buildOAuthCallbackUrl,
	normalizeCallbackPath,
	parseBearerToken,
	toAuthenticatedUser,
} from "./auth-utils";

describe("normalizeCallbackPath", () => {
	test("기본값은 /", () => {
		expect(normalizeCallbackPath(null)).toBe("/");
	});

	test("상대 경로만 허용한다", () => {
		expect(normalizeCallbackPath("/routes/abc")).toBe("/routes/abc");
	});

	test("외부 URL과 protocol-relative 경로를 차단한다", () => {
		expect(normalizeCallbackPath("https://evil.example")).toBe("/");
		expect(normalizeCallbackPath("//evil.example")).toBe("/");
		expect(normalizeCallbackPath("/\\evil.example")).toBe("/");
	});
});

describe("buildOAuthCallbackUrl", () => {
	test("현재 브라우저 origin으로 callback URL을 만든다", () => {
		expect(buildOAuthCallbackUrl("https://preview.example", "/routes/abc")).toBe(
			"https://preview.example/auth/callback?next=%2Froutes%2Fabc",
		);
	});
});

describe("parseBearerToken", () => {
	test("Bearer token을 파싱한다", () => {
		const request = new Request("https://example.com", {
			headers: { authorization: "Bearer test-token" },
		});
		expect(parseBearerToken(request)).toBe("test-token");
	});

	test("잘못된 scheme은 null을 반환한다", () => {
		const request = new Request("https://example.com", {
			headers: { authorization: "Basic test-token" },
		});
		expect(parseBearerToken(request)).toBeNull();
	});
});

describe("toAuthenticatedUser", () => {
	test("Supabase user metadata를 AuthenticatedUser로 변환한다", () => {
		const user = toAuthenticatedUser({
			id: "user-1",
			aud: "authenticated",
			role: "authenticated",
			email: "test@example.com",
			created_at: "2026-01-01T00:00:00.000Z",
			app_metadata: {},
			user_metadata: {
				full_name: "Test User",
				avatar_url: "https://example.com/avatar.png",
			},
		});

		expect(user).toEqual({
			id: "user-1",
			email: "test@example.com",
			name: "Test User",
			image: "https://example.com/avatar.png",
		});
	});
});
