import { NextResponse } from "next/server";

const APP_REDIRECT_SCHEME = "planmyrouteapp://oauth/google";

const toAppRedirect = (params: URLSearchParams) => {
	const location = new URL(APP_REDIRECT_SCHEME);
	params.forEach((value, key) => {
		if (!value) return;
		location.searchParams.set(key, value);
	});
	return location;
};

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code")?.trim();
	const state = requestUrl.searchParams.get("state")?.trim();
	const error = requestUrl.searchParams.get("error")?.trim();
	const errorDescription = requestUrl.searchParams.get("error_description")?.trim();

	if (!code && !error) {
		return NextResponse.json(
			{ error: "Missing code or error in query parameters" },
			{ status: 400 },
		);
	}

	const appParams = new URLSearchParams();
	if (code) appParams.set("code", code);
	if (state) appParams.set("state", state);
	if (error) appParams.set("error", error);
	if (errorDescription) appParams.set("error_description", errorDescription);

	return NextResponse.redirect(toAppRedirect(appParams), { status: 302 });
}
