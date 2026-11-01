import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createChunks, stringToBase64URL, stringFromBase64URL } from "@supabase/ssr";

test("캐시 조회 전에 실행되는 프록시와 미들웨어 진입점이 없음", () => {
  for (const path of ["proxy.ts", "middleware.ts", "src/proxy.ts", "src/middleware.ts"]) {
    expect(existsSync(join(process.cwd(), path)), path).toBe(false);
  }
  if (process.env.KFONDO_E2E_PRODUCTION === "1") {
    const manifest = JSON.parse(readFileSync(".next-i18n-test/server/middleware-manifest.json", "utf8"));
    expect(manifest.middleware).toEqual({});
  }
});
test("비한국어 브라우저에도 한국어를 제공하고 전환은 동의 후 실행", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("heading", { name: "내 기록은 몇 등일까?" })).toBeVisible();
  await page.getByRole("button", { name: "View in English", exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "How does my time rank?" })).toBeVisible();
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "내 기록은 몇 등일까?" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("complementary", { name: "Language suggestion" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("kfondo.language-choice"))).toBe("ko");
  expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")).toBeUndefined();
  await context.close();
});

test("한국어 유지 선택은 안내를 숨기고 URL과 브라우저 상태는 서버 언어를 바꾸지 않음", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: "http://localhost:4320" }]);
  const page = await context.newPage();
  await page.goto("/hongcheon?year=2025#course");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.getByRole("button", { name: "Keep Korean", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Language suggestion" })).toHaveCount(0);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/hongcheon\?year=2025#course$/);
  await page.goto("/hongcheon");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  // 기존 쿠키가 있어도 JavaScript 실행 전 응답의 언어는 URL로만 결정한다.
  const response = await context.request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(await response.text()).toContain('lang="ko"');
  await context.close();
});

test("한국어 브라우저에는 안내가 없고 관리자 응답은 캐시 금지", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "English", exact: true })).toBeEnabled();
  await expect(page.getByRole("complementary", { name: "Language suggestion" })).toHaveCount(0);
  const admin = await page.request.get("/admin/login");
  expect(admin.headers()["cache-control"]).toContain("no-store");
  expect(admin.headers()["cdn-cache-control"]).toBe("no-store");
  const blocked = await page.request.post("/api/admin/event-editions/example/records-upload");
  expect(blocked.status()).toBe(401);
  expect(blocked.headers()["cdn-cache-control"]).toBe("no-store");
});

test("프록시 없이 만료된 관리자 세션을 갱신하고 원래 URL로 복귀", async ({ page, context }) => {
  const cookies = createChunks("sb-127-auth-token", `base64-${stringToBase64URL(JSON.stringify({
    access_token: "expired-token", refresh_token: "fixture-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) - 60, token_type: "bearer",
    user: { id: "fixture-admin", email: "admin@example.test" },
  }))}`);
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, url: "http://localhost:4320" })));
  await page.goto("/admin?tab=summary#check");
  await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/admin\?tab=summary#check$/);
  const stored = (await context.cookies()).filter((cookie) => cookie.name.startsWith("sb-127-auth-token"));
  const raw = stored.sort((a, b) => a.name.localeCompare(b.name)).map((cookie) => cookie.value).join("");
  const session = JSON.parse(stringFromBase64URL(raw.slice(7)));
  expect(session.expires_at).toBeGreaterThan(Date.now() / 1000);
  const denied = await page.request.get("/admin/auth/refresh?next=https://evil.example/admin", { maxRedirects: 0 });
  expect(new URL(denied.headers()["location"]).pathname).toBe("/admin");
  expect(new URL(denied.headers()["location"]).hostname).toBe("localhost");
});

test("만료된 잘못된 세션은 로그인으로 돌아가고 인증 없는 업로드는 거절", async ({ page, context }) => {
  const cookies = createChunks("sb-127-auth-token", `base64-${stringToBase64URL(JSON.stringify({
    access_token: "expired-token", refresh_token: "invalid-refresh-token", expires_at: 1,
  }))}`);
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, url: "http://localhost:4320" })));
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toHaveCount(0);
  expect((await page.request.post("/api/courses/gpx-upload")).status()).toBe(401);
});

test("쿠키의 사용자 정보가 아닌 Auth 검증과 관리자 목록으로 권한 확인", async ({ page, context }) => {
  const cookies = createChunks("sb-127-auth-token", `base64-${stringToBase64URL(JSON.stringify({
    access_token: "fixture-nonadmin-token", refresh_token: "fixture-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "fixture-admin", email: "admin@example.test" },
  }))}`);
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, url: "http://localhost:4320" })));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "접근 거부 (Access Denied)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toHaveCount(0);
});

test("관리자 도메인 이동은 정적 규칙이며 API와 정적 파일은 제외", async ({ request }) => {
  for (const path of ["/", "/hongcheon", "/en/hongcheon"]) {
    const response = await request.get(path, {
      headers: { host: "admin.kfondo.cc" }, maxRedirects: 0,
    });
    expect(response.status(), path).toBe(307);
    expect(new URL(response.headers()["location"], "http://localhost:4320").pathname).toBe("/admin");
  }
  const publicAdmin = await request.get("/admin/login", {
    headers: { host: "www.kfondo.cc" }, maxRedirects: 0,
  });
  expect(publicAdmin.status()).toBe(307);
  expect(new URL(publicAdmin.headers()["location"], "http://localhost:4320").pathname).toBe("/");
  for (const path of ["/api/revalidate", "/favicon.ico"]) {
    const response = await request.get(path, {
      headers: { host: "admin.kfondo.cc" }, maxRedirects: 0,
    });
    expect(response.headers()["location"]).toBeUndefined();
  }
  const koreanPrefix = await request.get("/ko/hongcheon?year=2025", { maxRedirects: 0 });
  expect(koreanPrefix.status()).toBe(308);
  expect(koreanPrefix.headers()["location"]).toBe("/hongcheon?year=2025");
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
