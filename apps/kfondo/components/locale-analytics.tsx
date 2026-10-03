"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import posthog from "posthog-js";
export function LocaleAnalytics() {
  const locale = useLocale();
  useEffect(() => {
    posthog.register({ locale });
  }, [locale]);
  return null;
}
