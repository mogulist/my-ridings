import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { activityEvent, equalSecret, validSignature, webhookStore } from "@/lib/server/strava-webhook";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams;
	const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
	if (!verifyToken || query.get("hub.mode") !== "subscribe" ||
		!equalSecret(query.get("hub.verify_token") || "", verifyToken) || !query.get("hub.challenge")) {
		return new NextResponse(null, { status: 403 });
	}
	return NextResponse.json({ "hub.challenge": query.get("hub.challenge") });
}

export async function POST(request: NextRequest) {
	const secret = process.env.STRAVA_WEBHOOK_CALLBACK_SECRET;
	if (!secret || !process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID) return new NextResponse(null, { status: 503 });
	if (!equalSecret(request.nextUrl.searchParams.get("key") || "", secret)) return new NextResponse(null, { status: 403 });
	const body = await request.text();
	const signingSecret = process.env.STRAVA_WEBHOOK_SIGNING_SECRET;
	if (signingSecret && !validSignature(body, request.headers.get("x-strava-signature"), signingSecret)) {
		return new NextResponse(null, { status: 403 });
	}
	let event;
	try { event = JSON.parse(body); } catch { return new NextResponse(null, { status: 400 }); }
	if (!event || String(event.subscription_id) !== process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID) return new NextResponse(null, { status: 403 });
	const activity = activityEvent(event);
	if (!activity) return new NextResponse(null, { status: 200 });
	try {
		// Only persist an invalidation; Strava reads happen later in the athlete's browser.
		const { error } = await webhookStore().from("strava_activity_changes").upsert({
			...activity, version: randomUUID(), received_at: new Date().toISOString(),
		}, { onConflict: "owner_id,activity_id" });
		if (error) throw error;
		return new NextResponse(null, { status: 200 });
	} catch {
		console.error("Failed to persist Strava webhook invalidation");
		return new NextResponse(null, { status: 503 }); // Let Strava retry; do not acknowledge lost events.
	}
}
