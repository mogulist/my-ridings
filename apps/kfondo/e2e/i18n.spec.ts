import { test, expect } from "@playwright/test";
test("영어 자동 감지와 한국어 수동 선택 기억", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "How does my time rank?" })).toBeVisible();
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "내 기록은 몇 등일까?" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  const cookie = (await context.cookies()).find((c) => c.name === "NEXT_LOCALE");
  expect(cookie?.value).toBe("ko");
  await context.close();
});
test("영어 검색 및 전환에 hash 보존", async ({ page }) => {
  await page.goto("/en#q=Hongcheon");
  await expect(page.getByRole("heading", { name: "Hongcheon Gran Fondo" }).first()).toBeVisible();
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/#q=Hongcheon$/);
  await expect(page.getByRole("heading", { name: "홍천 그란폰도" }).first()).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.getByPlaceholder("Search events").fill("홍천");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hongcheon Gran Fondo" }).first()).toBeVisible();
});
test("기록 순위·통계 일치와 query 보존 및 공유", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const path = "/find-by-record/hongcheon/granfondo/2025/045000";
  await page.goto(path);
  const percentage = await page.getByTestId("participant-main").innerText();
  await expect(page.getByTestId("rank-main")).toHaveText("3위");
  await page.goto(`/en${path}`);
  await expect(page.getByTestId("rank-main")).toHaveText("#3");
  await expect(page.getByText("20 Apr 2025", { exact: true })).toBeVisible();
  await expect(page.getByTestId("participant-main")).toHaveText(percentage);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/en${path}`);
  await page.goto(`/en${path}?scope=kom`);
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}\\?scope=kom$`));
});
test("대회·지도 이동, SEO와 OG 이미지", async ({ page }) => {
  await page.goto("/en/hongcheon");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#page-title")).toHaveText("Hongcheon Gran Fondo");
  await expect(page.getByText("홍천 그란폰도", { exact: true })).toBeVisible();
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://kfondo.cc/en/hongcheon",
  );
  await expect(page.locator("link[hreflang=ko]")).toHaveAttribute(
    "href",
    "https://kfondo.cc/hongcheon",
  );
  await page.goto("/en/hongcheon/map/granfondo?year=2025");
  await expect(page.getByRole("button", { name: "Full screen", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/hongcheon\/map\/granfondo\?year=2025$/);
  await page.goto("/en/find-by-record/hongcheon/granfondo/2025/045000");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toBeTruthy();
  const localImage = new URL(image!);
  localImage.host = "localhost:4320";
  localImage.protocol = "http:";
  const response = await page.request.get(localImage.toString());
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});
test("sitemap·API·관리자 경로 제외와 영어 404", async ({ page }) => {
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("https://kfondo.cc/en/hongcheon");
  const api = await page.request.get("/api/revalidate", {
    headers: { "Accept-Language": "en-US" },
  });
  expect(api.status()).toBe(405);
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/en/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found | K-Fondo" })).toBeVisible();
});

test("모바일 영어 화면은 페이지 가로 넘침 없이 표시", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/en",
    "/en/hongcheon",
    "/en/find-by-record/hongcheon/granfondo/2025/045000",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "English", exact: true })).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.screenshot({ path: "/tmp/kfondo-mobile-en.png", fullPage: true });
});
