import { createTranslator } from "next-intl";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import type { Locale } from "./routing";
export function translator(locale: Locale) {
  return createTranslator({ locale, messages: locale === "en" ? en : ko });
}
