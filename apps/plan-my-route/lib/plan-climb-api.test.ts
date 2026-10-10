import { beforeEach, expect, mock, test } from "bun:test";
let user: { id: string } | null = { id: "owner" },
	owner = "owner",
	saveError: any = null,
	writes = 0;
const rows = new Map<string, any>();
mock.module("./get-authenticated-user", () => ({ getAuthenticatedUser: async () => user }));
mock.module("./supabase", () => ({
	supabaseAdmin: {
		from: (table: string) => {
			let payload: any = null;
			const query: any = {
				select: () => query,
				eq: () => query,
				upsert: (value: any) => {
					payload = value;
					return query;
				},
				single: async () => {
					if (table === "plan")
						return {
							data: {
								id: "plan",
								route: { user_id: owner, total_distance: 30000 },
								stages: [{ end_distance: 30000 }],
							},
							error: null,
						};
					if (table === "summit_catalog") return { data: { name: "등록된 이름" }, error: null };
					writes++;
					if (saveError) return { data: null, error: saveError };
					const key = payload.plan_id + ":" + payload.distance_m,
						prev = rows.get(key);
					const row = { id: prev?.id ?? "row", ...payload };
					rows.set(key, row);
					return { data: row, error: null };
				},
			};
			return query;
		},
	},
}));
const { POST } = await import("../app/api/mobile/plans/[planId]/climbs/route");
const request = (body: any) =>
	new Request("http://localhost/api/mobile/plans/plan/climbs", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
const context = { params: Promise.resolve({ planId: "plan" }) };
beforeEach(() => {
	user = { id: "owner" };
	owner = "owner";
	saveError = null;
	writes = 0;
	rows.clear();
});
test("rejects unauthenticated and other-owner writes", async () => {
	user = null;
	expect((await POST(request({ name: "고개", distanceM: 1000 }), context)).status).toBe(401);
	user = { id: "other" };
	expect((await POST(request({ name: "고개", distanceM: 1000 }), context)).status).toBe(404);
	expect(writes).toBe(0);
});
test("invalid and out-of-route distances never write", async () => {
	for (const value of [null, { name: "고개", distanceM: -10 }, { name: "고개", distanceM: 40000 }])
		expect((await POST(request(value), context)).status).toBe(400);
	expect(writes).toBe(0);
});
test("save retry is idempotent and linked catalog supplies canonical name", async () => {
	const body = {
		name: "잘못된 이름",
		distanceM: 20000,
		summitId: "11111111-1111-4111-8111-111111111111",
	};
	expect((await POST(request(body), context)).status).toBe(200);
	expect((await POST(request(body), context)).status).toBe(200);
	expect(rows.size).toBe(1);
	expect([...rows.values()][0].name).toBe("등록된 이름");
});
test("migration/save failures return an actionable response", async () => {
	saveError = { code: "42P01" };
	const response = await POST(request({ name: "고개", distanceM: 1000 }), context);
	expect(response.status).toBe(500);
	expect((await response.json()).error).toContain("데이터베이스 업데이트");
});
