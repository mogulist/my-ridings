import { createChunks, stringToBase64URL } from "@supabase/ssr";
import { adminReturnPath, needsSessionRefresh } from "./session-refresh";

const url = "https://project.supabase.co";
const now = 1_800_000_000_000;
const sessionCookies = (session: unknown) => createChunks(
  "sb-project-auth-token", `base64-${stringToBase64URL(JSON.stringify(session))}`, 30,
);

test("분할 쿠키의 만료가 가까울 때만 별도 인증 경로로 갱신", async () => {
  expect(await needsSessionRefresh(sessionCookies({
    expires_at: now / 1000 - 1, refresh_token: "test-refresh",
  }), url, now)).toBe(true);
  expect(await needsSessionRefresh(sessionCookies({
    expires_at: now / 1000 + 3600, refresh_token: "test-refresh",
  }), url, now)).toBe(false);
  expect(await needsSessionRefresh([], url, now)).toBe(false);
  expect(await needsSessionRefresh(sessionCookies({ expires_at: 0 }), url, now)).toBe(false);
  expect(await needsSessionRefresh([{ name: "sb-project-auth-token", value: "not-json" }], url, now)).toBe(false);
});

test("갱신 후 외부 사이트나 인증 경로로 돌아가지 않음", () => {
  expect(adminReturnPath("/admin/events/123?tab=records#course")).toBe("/admin/events/123?tab=records#course");
  for (const value of [null, "https://evil.example/admin", "//evil.example/admin", "/admin/../", "/admin/auth/refresh", "/admin/login", "/administrator"]) {
    expect(adminReturnPath(value)).toBe("/admin");
  }
});
