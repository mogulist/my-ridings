// Run with `bun run webhook:register`; Bun loads .env.local automatically.
const required = ["NEXT_PUBLIC_STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_WEBHOOK_BASE_URL", "STRAVA_WEBHOOK_VERIFY_TOKEN", "STRAVA_WEBHOOK_CALLBACK_SECRET"];
for (const name of required) {
	if (!process.env[name]) throw new Error(`Missing ${name}`);
}
const callback = new URL("/api/strava/webhook", process.env.STRAVA_WEBHOOK_BASE_URL);
if (callback.protocol !== "https:") throw new Error("Webhook callback requires a public HTTPS origin");
callback.searchParams.set("key", process.env.STRAVA_WEBHOOK_CALLBACK_SECRET);
const credentials = {
	client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
	client_secret: process.env.STRAVA_CLIENT_SECRET,
};
const endpoint = "https://www.strava.com/api/v3/push_subscriptions";
const existingResponse = await fetch(`${endpoint}?${new URLSearchParams(credentials)}`);
if (!existingResponse.ok) throw new Error(`Subscription lookup failed (${existingResponse.status})`);
const existing = await existingResponse.json();
if (existing.length) {
	if (existing[0].callback_url !== callback.toString()) {
		throw new Error("A different webhook subscription already exists. Review it before replacing it; Strava permits only one per application.");
	}
	console.log(`Existing subscription: set STRAVA_WEBHOOK_SUBSCRIPTION_ID=${existing[0].id}`);
} else {
	const response = await fetch(endpoint, {
		method: "POST",
		body: new URLSearchParams({ ...credentials, callback_url: callback.toString(), verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN }),
	});
	if (!response.ok) throw new Error(`Subscription registration failed (${response.status}); verify callback deployment and environment variables`);
	const subscription = await response.json();
	console.log(`Registered: set STRAVA_WEBHOOK_SUBSCRIPTION_ID=${subscription.id} and redeploy.`);
}
