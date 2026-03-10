import axios from "axios";
import type { StravaTokenResponse } from "@/src/types";
import { dbUtils } from "./indexeddb";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";

export const getAuthUrl = (): string => {
	const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
	const redirectUri =
		process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI || `${window.location.origin}/callback`;

	if (!clientId) {
		throw new Error("STRAVA_CLIENT_ID가 설정되지 않았습니다.");
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "activity:read_all",
		// approval_prompt는 deprecated되었을 수 있으므로 제거
	});

	const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;

	// 디버깅용 (개발 환경에서만)
	if (process.env.NODE_ENV === "development") {
		console.log("Strava Auth URL:", authUrl);
		console.log("Client ID:", clientId);
		console.log("Redirect URI:", redirectUri);
	}

	return authUrl;
};

export const exchangeCodeForToken = async (code: string): Promise<StravaTokenResponse> => {
	// 클라이언트에서 직접 호출하면 CORS 문제가 발생하므로
	// API Route를 통해 서버 사이드에서 처리
	// clientSecret은 서버에서만 사용
	const response = await axios.post<StravaTokenResponse>(
		"/api/auth/token",
		{
			code,
		},
		{
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	return response.data;
};

export const saveTokens = async (tokenResponse: StravaTokenResponse) => {
	await dbUtils.saveTokens({
		accessToken: tokenResponse.access_token,
		refreshToken: tokenResponse.refresh_token,
		expiresAt: tokenResponse.expires_at,
		athleteId: tokenResponse.athlete.id,
	});
};

export const getStoredTokens = async () => {
	return await dbUtils.getTokens();
};

export const clearAuth = async () => {
	await dbUtils.clearTokens();
};
