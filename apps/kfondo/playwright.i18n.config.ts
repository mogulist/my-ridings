import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "i18n.spec.ts",
  fullyParallel: true,
  use: { baseURL: "http://localhost:4320", locale: "ko-KR" },
  webServer: [
    {
      command: "bun e2e/fixtures/server.mjs",
      url: "http://127.0.0.1:4319/rest/v1/events",
      reuseExistingServer: false,
    },
    {
      command: "bun run dev --port 4320",
      url: "http://localhost:4320",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        KFONDO_TEST_DIST_DIR: ".next-i18n-test",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4319",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        SUPABASE_SERVICE_ROLE_KEY: "test-key",
        NEXT_PUBLIC_POSTHOG_KEY: "",
        NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: "",
      },
    },
  ],
});
