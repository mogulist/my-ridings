import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";
import type { StravaTokenResponse } from "@/src/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { refreshToken } = body;

		if (!refreshToken) {
			return NextResponse.json({ error: "Missing refreshToken parameter" }, { status: 400 });
		}

		const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
		const clientSecret = process.env.STRAVA_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
		}

		const response = await axios.post<StravaTokenResponse>(
			"https://www.strava.com/api/v3/oauth/token",
			{
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
				grant_type: "refresh_token",
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		return NextResponse.json(response.data);
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.error("Strava token refresh error:", error.response?.data);
			return NextResponse.json(
				{ error: error.response?.data || "Token refresh failed" },
				{ status: error.response?.status || 500 },
			);
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
