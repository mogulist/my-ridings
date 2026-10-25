import { afterEach, expect, spyOn, test } from "bun:test";
import { stravaStore } from "./strava-store";
import { webhookStore } from "./strava-webhook";

const names = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const original = names.map((name) => process.env[name]);
let restore: (() => void) | undefined;
afterEach(() => {
	restore?.();
	restore = undefined;
	names.forEach((name, i) => {
		if (original[i] === undefined) delete process.env[name];
		else process.env[name] = original[i];
	});
});
test("activities and webhook clients always send the custom schema profile", async () => {
	Object.assign(process.env, {
		SUPABASE_URL: "https://test.supabase.co",
		SUPABASE_SECRET_KEY: "test-server-key",
	});
	const requests: Headers[] = [];
	const mock = spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		requests.push(
			new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
		);
		return Response.json([]);
	});
	restore = () => mock.mockRestore();
	await stravaStore().from("activities").select("data");
	await webhookStore().from("strava_activity_changes").upsert({ owner_id: 42, activity_id: 5 });
	expect(requests[0].get("accept-profile")).toBe("strava_boost");
	expect(requests[1].get("content-profile")).toBe("strava_boost");
});
