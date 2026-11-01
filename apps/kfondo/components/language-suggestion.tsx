"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { LANGUAGE_CHOICE_KEY, navigateToLocale, rememberLanguageChoice } from "@/i18n/browser";

function shouldSuggestEnglish() {
  if (/^ko(?:-|$)/i.test(navigator.language)) return false;
  try {
    return !window.localStorage.getItem(LANGUAGE_CHOICE_KEY);
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("languagechange", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("languagechange", onChange);
  };
}

export function LanguageSuggestion() {
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);
  const suggested = useSyncExternalStore(subscribe, shouldSuggestEnglish, () => false);

  if (!suggested || dismissed || locale !== "ko") return null;

  return (
    <aside
      aria-label="Language suggestion"
      lang="en"
      className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-lg rounded-xl border border-border bg-background p-4 shadow-lg"
    >
      <p className="text-sm">Would you like to view this site in English?</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => navigateToLocale("en")}
          className="rounded-md bg-foreground px-3 py-2 text-background"
        >
          View in English
        </button>
        <button
          type="button"
          onClick={() => {
            rememberLanguageChoice("ko");
            setDismissed(true);
          }}
          className="rounded-md border border-border px-3 py-2"
        >
          Keep Korean
        </button>
      </div>
    </aside>
  );
}
