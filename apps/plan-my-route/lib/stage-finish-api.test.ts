import { beforeEach, expect, mock, test } from "bun:test";
let user: { id: string } | null = { id: "trusted-owner" },
	args: any = null,
	dbError: any = null;
mock.module("./get-authenticated-user", () => ({ getAuthenticatedUser: async () => user }));
mock.module("./supabase", () => ({
	supabaseAdmin: {
		rpc: async (name: string, input: any) => {
			args = { name, input };
			return { data: { endM: 8000 }, error: dbError };
		},
	},
}));
const { POST } = await import("../app/api/mobile/plans/[planId]/finish/route");
const id = "11111111-1111-4111-8111-111111111111";
const body = {
	requestId: id,
	currentStageId: id,
	nextStageId: id,
	newEndM: 8000,
	expectedCurrentStartM: 0,
	expectedCurrentEndM: 10000,
	expectedNextStartM: 10000,
	expectedNextEndM: 20000,
	currentGainM: 80,
	currentLossM: 0,
	nextGainM: 120,
	nextLossM: 0,
	poiIds: [],
};
const request = (value: any) =>
		new Request("http://localhost/finish", { method: "POST", body: JSON.stringify(value) }),
	context = { params: Promise.resolve({ planId: id }) };
beforeEach(() => {
	user = { id: "trusted-owner" };
	args = null;
	dbError = null;
});
test("rejects unauthenticated/invalid requests before RPC", async () => {
	user = null;
	expect((await POST(request(body), context)).status).toBe(401);
	user = { id: "owner" };
	expect((await POST(request({ ...body, newEndM: 12000 }), context)).status).toBe(400);
	expect(args).toBeNull();
});
test("binds trusted owner and request id to a single RPC", async () => {
	expect((await POST(request({ ...body, userId: "attacker" }), context)).status).toBe(200);
	expect(args.name).toBe("finish_plan_stage_atomic");
	expect(args.input.p_user_id).toBe("trusted-owner");
	expect(args.input.p_request_id).toBe(id);
});
test("returns actionable migration and concurrency failures", async () => {
	dbError = { code: "PGRST202" };
	expect((await POST(request(body), context)).status).toBe(503);
	dbError = { code: "P0001" };
	expect((await POST(request(body), context)).status).toBe(409);
});
