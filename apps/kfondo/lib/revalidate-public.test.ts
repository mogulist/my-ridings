jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidatePublicEvent, invalidatePublicHome } from "./revalidate-public";

beforeEach(() => jest.clearAllMocks());

test("대회 갱신은 해당 태그와 양쪽 언어의 실제 경로만 무효화한다", () => {
  invalidatePublicEvent("hongcheon");
  expect(revalidateTag).toHaveBeenCalledWith("event-hongcheon", { expire: 0 });
  expect(jest.mocked(revalidatePath).mock.calls).toEqual([
    ["/ko/hongcheon"], ["/ko/find-by-record/hongcheon", "layout"],
    ["/en/hongcheon"], ["/en/find-by-record/hongcheon", "layout"],
    ["/ko"], ["/en"], ["/sitemap.xml"],
  ]);
});

test("임의 경로로 무효화 범위를 넓힐 수 없다", () => {
  expect(() => invalidatePublicEvent("../")).toThrow("Invalid event slug");
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(revalidateTag).not.toHaveBeenCalled();
});

test("홈 갱신은 양쪽 언어의 홈과 사이트맵만 대상으로 한다", () => {
  invalidatePublicHome();
  expect(jest.mocked(revalidatePath).mock.calls).toEqual([["/ko"], ["/en"], ["/sitemap.xml"]]);
  expect(revalidateTag).not.toHaveBeenCalled();
});
