import { afterEach, expect, spyOn, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET as handshake, POST as webhook } from "../../app/api/strava/webhook/route";
import { GET as changes, POST as session } from "../../app/api/strava/changes/route";
import * as server from "./strava-webhook";

const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRAVA_CLIENT_SECRET", "STRAVA_WEBHOOK_VERIFY_TOKEN", "STRAVA_WEBHOOK_CALLBACK_SECRET", "STRAVA_WEBHOOK_SUBSCRIPTION_ID", "STRAVA_WEBHOOK_SIGNING_SECRET"];
const originals = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const mocks: Array<{ mockRestore(): void }> = [];
afterEach(() => {
	for (const name of names) {
		if (originals[name] === undefined) delete process.env[name]; else process.env[name] = originals[name];
	}
	mocks.forEach((mock) => mock.mockRestore()); mocks.length = 0;
});
function configure() {
	Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-key", STRAVA_CLIENT_SECRET: "secret", STRAVA_WEBHOOK_VERIFY_TOKEN: "verify", STRAVA_WEBHOOK_CALLBACK_SECRET: "callback", STRAVA_WEBHOOK_SUBSCRIPTION_ID: "123" });
	delete process.env.STRAVA_WEBHOOK_SIGNING_SECRET;
}
const event = { subscription_id: 123, object_type: "activity", aspect_type: "update", owner_id: 42, object_id: 456, event_time: 1800000000 };
function request(body: unknown, key = "callback") {
	return new NextRequest(`https://example.com/api/strava/webhook?key=${key}`, { method: "POST", body: JSON.stringify(body) });
}

test("subscription handshake validates token before echoing the challenge", async () => {
	configure();
	const response = await handshake(new NextRequest("https://example.com/api/strava/webhook?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=challenge"));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ "hub.challenge": "challenge" });
	expect((await handshake(new NextRequest("https://example.com/api/strava/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge"))).status).toBe(403);
});

test("unauthorized callbacks cannot write invalidations", async () => {
	configure();
	expect((await webhook(request(event, "wrong"))).status).toBe(403);
	expect((await webhook(request({ ...event, subscription_id: 999 }))).status).toBe(403);
	process.env.STRAVA_WEBHOOK_SIGNING_SECRET = "signing-secret";
	expect((await webhook(request(event))).status).toBe(403);
});

test("callback acknowledges only after a durable write and returns 503 on failure", async () => {
	configure();
	const writes: unknown[] = [];
	let fail = false;
	const mock = spyOn(server, "webhookStore").mockImplementation(() => ({ from: () => ({ upsert: async (value: unknown) => { writes.push(value); return { error: fail ? new Error("offline") : null }; } }) }) as unknown as ReturnType<typeof server.webhookStore>);
	mocks.push(mock);
	expect((await webhook(request(event))).status).toBe(200);
	expect(writes[0]).toMatchObject({ owner_id: 42, activity_id: 456 });
	fail = true;
	expect((await webhook(request(event))).status).toBe(503);
});

test("change reads derive owner from signed ticket and scope every query", async () => {
	configure();
	expect((await changes(new NextRequest("https://example.com/api/strava/changes"))).status).toBe(401);
	const filters: unknown[] = [];
	const query = {
		select: () => query, eq: (...args: unknown[]) => { filters.push(args); return query; },
		gt: () => query, order: () => query, limit: async () => ({ data: [{ activity_id: 456, version: "v1" }], error: null }),
	};
	mocks.push(spyOn(server, "webhookStore").mockImplementation(() => ({ from: () => query }) as unknown as ReturnType<typeof server.webhookStore>));
	const response = await changes(new NextRequest("https://example.com/api/strava/changes?owner_id=999", { headers: { authorization: `Bearer ${server.readerTicket(42, Math.floor(Date.now() / 1000) + 60)}` } }));
	expect(response.status).toBe(200);
	expect(filters).toEqual([["owner_id", 42]]);
	expect(response.headers.get("cache-control")).toBe("no-store");
});

test("reader identity comes from Strava rather than client request parameters", async () => {
	configure();
	mocks.push(spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: 42 })));
	const response = await session(new NextRequest("https://example.com/api/strava/changes?owner_id=999", { method: "POST", headers: { authorization: "Bearer athlete-token" } }));
	const body = await response.json();
	expect(body.athleteId).toBe(42);
	expect(server.ticketAthlete(body.ticket)).toBe(42);
});
