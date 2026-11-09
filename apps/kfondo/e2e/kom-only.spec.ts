import { test, expect } from "@playwright/test";

test("KOM만 공개된 대회는 전체 선택 없이 남녀 구분과 KOM 검색을 제공한다", async ({ page }) => {
  await page.goto("/buyeo");
  await expect(page.getByRole("radio", { name: "전체", exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "남", exact: true })).toBeEnabled();
  await page.getByRole("radio", { name: "여", exact: true }).click();
  await expect(page.getByRole("radio", { name: "여", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("link", { name: "기록 찾기", exact: true }).click();
  await expect(page).toHaveURL(/scope=kom$/);
  await expect(page.getByText("KOM 기록 입력", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "전체", exact: true })).toHaveCount(0);

  await page.getByRole("textbox").fill("00:06:00");
  await page.getByRole("button", { name: "기록 찾기", exact: true }).click();
  await expect(page.getByText("2위", { exact: true })).toBeVisible();
  await expect(page.getByText("KOM 기록 기준", { exact: true })).toBeVisible();
  await expect(page.getByText("완주자 기준", { exact: true })).toHaveCount(0);
  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  const localImage = new URL(imageUrl!);
  localImage.host = "localhost:4320";
  localImage.protocol = "http:";
  const image = await page.request.get(localImage.toString());
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  await page.getByRole("radio", { name: "여", exact: true }).click();
  await expect(page.getByText("여자 1위", { exact: false })).toBeVisible();
});

test("예전 전체 결과 링크는 입력 시간을 재사용하지 않고 KOM 입력으로 안내한다", async ({ page }) => {
  await page.goto("/find-by-record/buyeo/granfondo/2026/040000?scope=full");
  await expect(page).toHaveURL(/\/2026\?scope=kom$/);
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.getByText("공식 공개 자료는 KOM 구간 기록만 제공합니다.", { exact: true })).toBeVisible();
});

test("영어 직접 링크도 KOM 입력으로 표시하고 기존 대회의 전체 선택은 유지한다", async ({ page }) => {
  await page.goto("/en/find-by-record/buyeo/granfondo/2026?scope=full");
  await expect(page.getByRole("textbox")).toHaveValue("");
  await expect(page.getByText("Only KOM segment records are officially available.", { exact: true })).toBeVisible();
  await page.goto("/find-by-record/hongcheon/granfondo/2025");
  await expect(page.getByRole("radio", { name: "전체", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "KOM", exact: true })).toBeVisible();
});
