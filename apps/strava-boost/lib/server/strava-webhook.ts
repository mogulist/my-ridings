import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function webhookStore() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Webhook database is not configured");
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function webhooksEnabled() {
	return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
		process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.STRAVA_CLIENT_SECRET &&
		process.env.STRAVA_WEBHOOK_VERIFY_TOKEN && process.env.STRAVA_WEBHOOK_CALLBACK_SECRET &&
		process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID);
}

export function equalSecret(a: string, b: string) {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

// Strava's signed webhook format. Reject malformed signatures and replays.
export function validSignature(body: string, header: string | null, secret: string, now = Date.now()) {
	if (!header) return false;
	const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=")));
	if (!/^\d+$/.test(parts.t || "") || !/^[a-f0-9]{64}$/.test(parts.v1 || "")) return false;
	if (Math.abs(now / 1000 - Number(parts.t)) > 300) return false;
	const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest("hex");
	return equalSecret(parts.v1, expected);
}

function sign(value: string) {
	const secret = process.env.STRAVA_CLIENT_SECRET;
	if (!secret) throw new Error("Strava is not configured");
	return createHmac("sha256", secret).update(`webhook-reader:${value}`).digest("hex");
}

export function readerTicket(athleteId: number, expiresAt: number) {
	const value = `${athleteId}.${expiresAt}`;
	return `${value}.${sign(value)}`;
}

export function ticketAthlete(ticket: string): number | null {
	const [id, expiry, signature, extra] = ticket.split(".");
	if (extra || !/^\d+$/.test(id || "") || !/^\d+$/.test(expiry || "") || !signature) return null;
	if (Number(expiry) <= Date.now() / 1000 || !equalSecret(signature, sign(`${id}.${expiry}`))) return null;
	return Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null;
}

export function activityEvent(value: unknown): { owner_id: number; activity_id: number } | null {
	if (!value || typeof value !== "object") return null;
	const event = value as Record<string, unknown>;
	if (event.object_type !== "activity" || !["create", "update", "delete"].includes(String(event.aspect_type))) return null;
	if (![event.owner_id, event.object_id, event.event_time].every((v) => typeof v === "number" && Number.isSafeInteger(v) && v > 0)) return null;
	return { owner_id: event.owner_id as number, activity_id: event.object_id as number };
}
