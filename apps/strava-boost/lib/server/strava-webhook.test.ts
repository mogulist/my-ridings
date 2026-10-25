import { afterEach, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { activityEvent, readerTicket, ticketAthlete, validSignature } from "./strava-webhook";

const originalSecret = process.env.STRAVA_CLIENT_SECRET;
afterEach(() => {
	if (originalSecret === undefined) delete process.env.STRAVA_CLIENT_SECRET;
	else process.env.STRAVA_CLIENT_SECRET = originalSecret;
});

test("signed callbacks reject tampering, malformed signatures, and expired timestamps", () => {
	const now = 1800000000000;
	const body = '{"object_id":123}';
	const timestamp = String(now / 1000);
	const hash = createHmac("sha256", "secret").update(`${timestamp}.${body}`).digest("hex");
	const header = `t=${timestamp},v1=${hash}`;
	expect(validSignature(body, header, "secret", now)).toBe(true);
	expect(validSignature(body + " ", header, "secret", now)).toBe(false);
	expect(validSignature(body, header, "secret", now + 301000)).toBe(false);
	expect(validSignature(body, "t=no,v1=short", "secret", now)).toBe(false);
	expect(validSignature(body, null, "secret", now)).toBe(false);
});

test("reader tickets bind athlete identity and expiry to the server secret", () => {
	process.env.STRAVA_CLIENT_SECRET = "test-only-secret";
	const ticket = readerTicket(123, Math.floor(Date.now() / 1000) + 60);
	expect(ticketAthlete(ticket)).toBe(123);
	expect(ticketAthlete(ticket.replace(/^123/, "456"))).toBeNull();
	expect(ticketAthlete(readerTicket(123, 1))).toBeNull();
	expect(ticketAthlete(ticket + ".extra")).toBeNull();
	expect(ticketAthlete("")).toBeNull();
});

test("activity invalidations accept supported events and reject invalid identities", () => {
	const event = { object_type: "activity", aspect_type: "update", owner_id: 42, object_id: 123, event_time: 1800000000 };
	for (const aspect_type of ["create", "update", "delete"]) {
		expect(activityEvent({ ...event, aspect_type })).toEqual({ owner_id: 42, activity_id: 123 });
	}
	expect(activityEvent({ ...event, owner_id: "42" })).toBeNull();
	expect(activityEvent({ ...event, object_id: -1 })).toBeNull();
	expect(activityEvent({ ...event, object_type: "athlete" })).toBeNull();
	expect(activityEvent(null)).toBeNull();
});
