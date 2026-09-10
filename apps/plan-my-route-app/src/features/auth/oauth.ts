type OAuthCallback =
	| { type: "code"; code: string }
	| { type: "tokens"; accessToken: string; refreshToken: string };

export const parseOAuthCallback = (url: string): OAuthCallback => {
	const parsedUrl = new URL(url);
	const params = new URLSearchParams(parsedUrl.search);
	const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
	const getParam = (name: string) => params.get(name) ?? hashParams.get(name);
	const error = getParam("error");

	if (error) throw new Error(getParam("error_description") ?? error);

	const code = getParam("code");
	if (code) return { type: "code", code };

	const accessToken = getParam("access_token");
	const refreshToken = getParam("refresh_token");
	if (accessToken && refreshToken) {
		return { type: "tokens", accessToken, refreshToken };
	}

	throw new Error("OAuth 콜백에 인증 정보가 없습니다.");
};

export const createSessionFromUrl = async (url: string) => {
	const callback = parseOAuthCallback(url);
	const { supabase } = await import("./supabase-client");

	if (callback.type === "code") {
		const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
		if (error) throw error;
		return;
	}

	const { error } = await supabase.auth.setSession({
		access_token: callback.accessToken,
		refresh_token: callback.refreshToken,
	});
	if (error) throw error;
};
