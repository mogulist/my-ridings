import { test, expect } from "@playwright/test";

test("메인 페이지 로드 및 기본 콘텐츠 표시", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "내 기록은 몇 등일까?" })).toBeVisible();
  await expect(page.getByPlaceholder("대회 이름을 검색하세요")).toBeVisible();
});

test("메인 페이지 검색 - hash 기반 필터링", async ({ page }) => {
  await page.goto("/");
  const searchInput = page.getByPlaceholder("대회 이름을 검색하세요");
  await searchInput.fill("통영");
  await page.getByRole("button", { name: "검색", exact: true }).click();

  await expect(page).toHaveURL(/#q=/);
  await expect(page.getByText("통영")).toBeVisible({ timeout: 5000 });
});
