jest.mock("@/lib/require-admin", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/revalidate-public", () => ({ invalidatePublicHome: jest.fn(), invalidatePublicEvent: jest.fn() }));
import { requireAdmin } from "@/lib/require-admin";
import { invalidatePublicHome, invalidatePublicEvent } from "@/lib/revalidate-public";
import { revalidateHomePage, revalidateEventPage } from "./revalidate";

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async () => ({ ok: true })) as jest.Mock;
});
test("관리자 검증 실패 시 서버 액션으로 캐시를 무효화할 수 없다", async () => {
  jest.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));
  await expect(revalidateHomePage()).rejects.toThrow("Forbidden");
  await expect(revalidateEventPage("hongcheon")).rejects.toThrow("Forbidden");
  expect(invalidatePublicHome).not.toHaveBeenCalled();
  expect(invalidatePublicEvent).not.toHaveBeenCalled();
});
test("관리자는 해당 대회 캐시를 갱신할 수 있다", async () => {
  jest.mocked(requireAdmin).mockResolvedValue(undefined);
  await revalidateEventPage("hongcheon");
  expect(invalidatePublicEvent).toHaveBeenCalledWith("hongcheon");
});

test("관리자는 홈 캐시도 갱신할 수 있다", async () => {
  jest.mocked(requireAdmin).mockResolvedValue(undefined);
  await revalidateHomePage();
  expect(invalidatePublicHome).toHaveBeenCalled();
});
