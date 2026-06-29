import posthog from "posthog-js";

const isWeekend = [0, 6].includes(new Date().getDay());

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "https://us.i.posthog.com",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
  session_recording: {
    sample_rate: isWeekend ? 0.2 : 0.5,
  },
});

// IMPORTANT: Never combine this approach with other client-side PostHog initialization
// approaches, especially components like a PostHogProvider.
// instrumentation-client.ts is the correct solution for initializing client-side PostHog
// in Next.js 15.3+ apps.
