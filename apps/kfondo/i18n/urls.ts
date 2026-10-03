import type { Locale } from "./routing";
export const SITE_URL = "https://kfondo.cc";
export function localePath(path: string, locale: Locale): string {
  const suffixIndex = path.search(/[?#]/);
  const pathname = suffixIndex < 0 ? path : path.slice(0, suffixIndex);
  const suffix = suffixIndex < 0 ? "" : path.slice(suffixIndex);
  const clean = pathname.replace(/^\/(ko|en)(?=\/|$)/, "") || "/";
  return (locale === "en" ? `/en${clean === "/" ? "" : clean}` : clean) + suffix;
}
export function pageAlternates(path: string, locale: Locale) {
  return {
    canonical: `${SITE_URL}${localePath(path, locale)}`,
    languages: {
      ko: `${SITE_URL}${localePath(path, "ko")}`,
      en: `${SITE_URL}${localePath(path, "en")}`,
      "x-default": `${SITE_URL}${localePath(path, "ko")}`,
    },
  };
}
