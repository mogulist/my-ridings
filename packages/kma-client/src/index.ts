/**
 * @my-ridings/kma-client — 기상청 API 허브 호출 + 응답 정규화.
 *
 * 네트워크는 이 패키지 안에서만 수행. DB·Next는 모름. 단위 테스트 가능하도록 `fetchImpl` 주입 지원.
 */

export type { FetchMidInput } from "./fetch-mid-term";
export { fetchMidLandFcst, fetchMidTa } from "./fetch-mid-term";
export type { FetchVilageFcstInput } from "./fetch-short-term";
export { fetchVilageFcst } from "./fetch-short-term";
export { KmaApiError } from "./kma-errors";
export type { MidLandItem, MidTaItem } from "./mid-term-schema";

export type { MidTermDay, NormalizedMidTerm } from "./normalize-mid-term";
export { kstTmFcToUtcIso, normalizeMidTerm } from "./normalize-mid-term";
export type { NormalizedShortTerm, ShortTermHourly } from "./normalize-short-term";
export {
	kstYmdHmToUtcIso,
	normalizeShortTerm,
} from "./normalize-short-term";
export type {
	VilageFcstItem,
	VilageFcstResponse,
} from "./short-term-schema";
