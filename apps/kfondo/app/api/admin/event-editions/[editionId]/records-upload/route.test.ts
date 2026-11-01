/** @jest-environment node */
jest.mock("@vercel/blob", () => ({ put: jest.fn(async () => ({ url: "https://example.test/records.json" })) }));
jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/revalidate-public", () => ({ invalidatePublicEvent: jest.fn() }));
jest.mock("@/lib/posthog-server", () => ({ getPostHogClient: () => ({ capture: jest.fn() }) }));
import { createClient } from "@/lib/supabase/server";
import { invalidatePublicEvent } from "@/lib/revalidate-public";
import { POST } from "./route";

const context = { params: Promise.resolve({ editionId: "edition-1" }) };
beforeEach(() => jest.clearAllMocks());
function mockClient(user: { email: string } | null, admin = true) {
  const builder = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: admin ? { id: "admin", events: { slug: "hongcheon" } } : null, error: null }),
  };
  jest.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) }, from: () => builder,
  } as never);
  return builder;
}

test("로그인하지 않았거나 관리자가 아니면 업로드 및 무효화를 거부한다", async () => {
  const request = () => new Request("https://example.test/api/upload", { method: "POST" });
  mockClient(null);
  expect((await POST(request(), context)).status).toBe(401);
  mockClient({ email: "viewer@example.test" }, false);
  expect((await POST(request(), context)).status).toBe(403);
  expect(invalidatePublicEvent).not.toHaveBeenCalled();
});

test("업로드 DB 저장 후 해당 대회 캐시를 즉시 무효화한다", async () => {
  const builder = mockClient({ email: "admin@example.test" });
  const data = new FormData();
  data.set("recordsFile", new File(["[]"], "records.json", { type: "application/json" }));
  const response = await POST(new Request("https://example.test/api/upload", { method: "POST", body: data }), context);
  expect(response.status).toBe(200);
  expect(builder.update).toHaveBeenCalledWith({ records_blob_url: "https://example.test/records.json" });
  expect(invalidatePublicEvent).toHaveBeenCalledWith("hongcheon");
});
