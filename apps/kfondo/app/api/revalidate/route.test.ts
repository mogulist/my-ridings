/** @jest-environment node */
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/revalidate-public", () => ({ invalidatePublicHome: jest.fn(), invalidatePublicEvent: jest.fn() }));
import { POST } from "./route";
import { revalidatePath } from "next/cache";
import { invalidatePublicEvent } from "@/lib/revalidate-public";

const originalSecret = process.env.REVALIDATE_SECRET;
afterAll(() => { if (originalSecret === undefined) delete process.env.REVALIDATE_SECRET;
  else process.env.REVALIDATE_SECRET = originalSecret; });
beforeEach(() => { jest.clearAllMocks(); process.env.REVALIDATE_SECRET = "fixture-secret"; });
const request = (token?: string, body: object = { tag: "event-hongcheon" }) => new Request("https://example.test/api/revalidate", {
  method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

test("시크릿 누락과 잘못된 인증은 캐시를 건드리지 않는다", async () => {
  delete process.env.REVALIDATE_SECRET;
  expect((await POST(request())).status).toBe(503);
  process.env.REVALIDATE_SECRET = "fixture-secret";
  expect((await POST(request("wrong"))).status).toBe(401);
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(invalidatePublicEvent).not.toHaveBeenCalled();
});

test("인증된 대회 태그 요청은 전체 캐시를 지우지 않는다", async () => {
  expect((await POST(request("fixture-secret"))).status).toBe(200);
  expect(invalidatePublicEvent).toHaveBeenCalledWith("hongcheon");
  expect(revalidatePath).not.toHaveBeenCalled();
  expect((await POST(request("fixture-secret", { tag: "event-../" }))).status).toBe(400);
});
