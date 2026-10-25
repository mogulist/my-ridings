import { NextRequest, NextResponse } from "next/server";
import { readerTicket, ticketAthlete, webhookStore, webhooksEnabled } from "@/lib/server/strava-webhook";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

// Exchange an athlete access token for a short-lived, read-only invalidation ticket.
// This avoids calling Strava every time the browser checks for changes.
export async function POST(request: NextRequest) {
	if (!webhooksEnabled()) return NextResponse.json({ enabled: false }, { headers });
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) return new NextResponse(null, { status: 401 });
	try {
		const response = await fetch("https://www.strava.com/api/v3/athlete", {
			headers: { Authorization: authorization }, cache: "no-store", signal: AbortSignal.timeout(10000),
		});
		if (!response.ok) return new NextResponse(null, { status: response.status === 401 ? 401 : 502 });
		const athlete = await response.json();
		if (!Number.isSafeInteger(athlete.id) || athlete.id <= 0) return new NextResponse(null, { status: 502 });
		const expiresAt = Math.floor(Date.now() / 1000) + 3600;
		return NextResponse.json({ enabled: true, athleteId: athlete.id, expiresAt, ticket: readerTicket(athlete.id, expiresAt) }, { headers });
	} catch { return new NextResponse(null, { status: 502 }); }
}

export async function GET(request: NextRequest) {
	if (!webhooksEnabled()) return NextResponse.json({ enabled: false, changes: [] }, { headers });
	const athleteId = ticketAthlete(request.headers.get("authorization")?.replace(/^Bearer /, "") || "");
	if (!athleteId) return new NextResponse(null, { status: 401 });
	const after = Number(request.nextUrl.searchParams.get("after") || 0);
	if (!Number.isSafeInteger(after) || after < 0) return new NextResponse(null, { status: 400 });
	try {
		const { data, error } = await webhookStore().from("strava_activity_changes")
			.select("activity_id,version").eq("owner_id", athleteId).gt("activity_id", after)
			.order("activity_id").limit(100);
		if (error) throw error;
		return NextResponse.json({ enabled: true, changes: data, hasMore: data.length === 100 }, { headers });
	} catch { return new NextResponse(null, { status: 503 }); }
}
