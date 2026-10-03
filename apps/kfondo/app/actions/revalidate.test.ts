import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateHomePage, revalidateEventPage } from "./revalidate";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async () => ({ ok: true })) as jest.Mock;
});
test("홈 수정은 두 언어와 공개 locale 레이아웃을 갱신", async () => {
  await revalidateHomePage();
  expect(revalidatePath).toHaveBeenCalledWith("/");
  expect(revalidatePath).toHaveBeenCalledWith("/en");
  expect(revalidatePath).toHaveBeenCalledWith("/(public)/[locale]", "layout");
});
test("대회 수정은 기록 Blob 태그와 모든 locale 페이지를 갱신", async () => {
  await revalidateEventPage("hongcheon");
  expect(revalidateTag).toHaveBeenCalledWith("event-hongcheon", { expire: 0 });
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
});
