import type { Locale } from "./routing";
import { localePath } from "./urls";
/** 언어 선택을 먼저 저장해 접두사 제거 시에도 query/hash를 보존합니다. */
export function navigateToLocale(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  window.location.replace(
    `${localePath(window.location.pathname, locale)}${window.location.search}${window.location.hash}`,
  );
}
