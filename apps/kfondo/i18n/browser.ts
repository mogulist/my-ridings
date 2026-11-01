import type { Locale } from "./routing";
import { localePath } from "./urls";
export const LANGUAGE_CHOICE_KEY = "kfondo.language-choice";

export function rememberLanguageChoice(locale: Locale) {
  try {
    window.localStorage.setItem(LANGUAGE_CHOICE_KEY, locale);
  } catch {
    // 저장소를 사용할 수 없어도 언어 전환은 동작한다.
  }
}

/** 언어는 URL로 결정하고 query/hash를 보존한다. 선택은 브라우저에만 저장한다. */
export function navigateToLocale(locale: Locale) {
  rememberLanguageChoice(locale);
  window.location.replace(
    `${localePath(window.location.pathname, locale)}${window.location.search}${window.location.hash}`,
  );
}
