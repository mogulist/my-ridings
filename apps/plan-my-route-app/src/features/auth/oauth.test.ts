import { describe, expect, test } from "bun:test";

import { parseOAuthCallback } from "./oauth";

describe("parseOAuthCallback", () => {
	test("PKCE 인증 코드를 반환한다", () => {
		expect(parseOAuthCallback("planmyrouteapp://auth/callback?code=oauth-code")).toEqual({
			type: "code",
			code: "oauth-code",
		});
	});

	test("access token과 refresh token을 반환한다", () => {
		expect(
			parseOAuthCallback(
				"planmyrouteapp://auth/callback#access_token=access&refresh_token=refresh",
			),
		).toEqual({
			type: "tokens",
			accessToken: "access",
			refreshToken: "refresh",
		});
	});

	test("OAuth 오류를 예외로 반환한다", () => {
		expect(() =>
			parseOAuthCallback(
				"planmyrouteapp://auth/callback?error=access_denied&error_description=Login%20cancelled",
			),
		).toThrow("Login cancelled");
	});

	test("세션 정보가 없으면 예외를 반환한다", () => {
		expect(() => parseOAuthCallback("planmyrouteapp://auth/callback")).toThrow(
			"OAuth 콜백에 인증 정보가 없습니다.",
		);
	});
});
