import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localePrefix: "as-needed",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  alternateLinks: false,
});
export type Locale = (typeof routing.locales)[number];
