"use client";

import { useLocale } from "next-intl";
import { useSyncExternalStore } from "react";
import { navigateToLocale } from "@/i18n/browser";
import type { Locale } from "@/i18n/routing";
import posthog from "posthog-js";
const subscribe = () => () => {};

export function LanguageSwitcher() {
  const locale = useLocale();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  function change(next: Locale) {
    if (next === locale) return;
    posthog.capture("language_changed", { from_locale: locale, locale: next });
    navigateToLocale(next);
  }
  return (
    <nav
      aria-label={locale === "en" ? "Language" : "언어"}
      className="ml-auto flex shrink-0 gap-2 text-xs sm:text-sm"
    >
      {(["ko", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={!hydrated}
          lang={value}
          aria-pressed={locale === value}
          onClick={() => change(value)}
          className={
            locale === value
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          {value === "ko" ? "한국어" : "English"}
        </button>
      ))}
    </nav>
  );
}
