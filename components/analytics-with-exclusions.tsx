"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

export function AnalyticsWithExclusions() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const pathname = event.url.startsWith("http")
          ? new URL(event.url).pathname
          : event.url;
        if (pathname.startsWith("/admin")) return null;
        return event;
      }}
    />
  );
}
