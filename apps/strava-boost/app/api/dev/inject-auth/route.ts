// Dev-only: injects Strava tokens into the browser's IndexedDB via a redirect page.
// Disabled completely in production.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STRAVA_TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";

function forbidden() {
	return new NextResponse("Not found", { status: 404 });
}

export async function GET(request: Request) {
	if (process.env.NODE_ENV === "production") return forbidden();

	const secret = new URL(request.url).searchParams.get("secret");
	const devSecret = process.env.DEV_AUTH_SECRET;
	if (!devSecret || secret !== devSecret) return forbidden();

	const refreshToken = process.env.DEV_STRAVA_REFRESH_TOKEN ?? process.env.STRAVA_REFRESH_TOKEN;
	const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
	const clientSecret = process.env.STRAVA_CLIENT_SECRET;

	if (!refreshToken || !clientId || !clientSecret) {
		return new NextResponse(
			"Missing env: DEV_STRAVA_REFRESH_TOKEN (or STRAVA_REFRESH_TOKEN), NEXT_PUBLIC_STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET",
			{ status: 500 },
		);
	}

	const res = await fetch(STRAVA_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		return new NextResponse(`Strava refresh failed: ${text}`, { status: 502 });
	}

	const data = (await res.json()) as {
		access_token: string;
		refresh_token: string;
		expires_at: number;
		athlete: { id: number };
	};

	const redirect = new URL(request.url).searchParams.get("redirect") ?? "/";

	// Return an HTML page that writes the token into IndexedDB then navigates away.
	const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Dev auth injection…</title></head>
<body>
<p>Injecting dev auth tokens…</p>
<script>
(async () => {
  const DB_NAME = 'strava-stats';
  const DB_VERSION = 3;
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('tokens'))
        d.createObjectStore('tokens', { keyPath: 'id' });
    };
  });
  await new Promise((res, rej) => {
    const tx = db.transaction(['tokens'], 'readwrite');
    const req = tx.objectStore('tokens').put({
      id: 'tokens',
      accessToken: ${JSON.stringify(data.access_token)},
      refreshToken: ${JSON.stringify(data.refresh_token)},
      expiresAt: ${data.expires_at},
      athleteId: ${data.athlete.id},
    });
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  window.location.href = ${JSON.stringify(redirect)};
})();
</script>
</body>
</html>`;

	return new NextResponse(html, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
