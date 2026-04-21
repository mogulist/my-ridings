import { KmaApiError } from "./kma-errors";
import { type NormalizedShortTerm, normalizeShortTerm } from "./normalize-short-term";
import { vilageFcstResponseSchema } from "./short-term-schema";

const SHORT_TERM_ENDPOINT =
	"https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst";

export type FetchVilageFcstInput = {
	nx: number;
	ny: number;
	/** "YYYYMMDD" (KST) */
	baseDate: string;
	/** "HHmm" — 02/05/08/11/14/17/20/23 (KST) */
	baseTime: string;
	authKey: string;
	numOfRows?: number;
	/** 테스트 주입용 fetch */
	fetchImpl?: typeof fetch;
};

/**
 * 기상청 API 허브의 단기예보 호출.
 *
 * 3일치 예보 전체를 가져오려면 numOfRows를 넉넉히(>=1000) 지정해야 한다.
 */
export const fetchVilageFcst = async (
	input: FetchVilageFcstInput,
): Promise<NormalizedShortTerm | null> => {
	const { nx, ny, baseDate, baseTime, authKey, numOfRows = 1200, fetchImpl = fetch } = input;
	const url = new URL(SHORT_TERM_ENDPOINT);
	url.searchParams.set("authKey", authKey);
	url.searchParams.set("pageNo", "1");
	url.searchParams.set("numOfRows", String(numOfRows));
	url.searchParams.set("dataType", "JSON");
	url.searchParams.set("base_date", baseDate);
	url.searchParams.set("base_time", baseTime);
	url.searchParams.set("nx", String(nx));
	url.searchParams.set("ny", String(ny));

	const res = await fetchImpl(url.toString());
	if (!res.ok) {
		throw new KmaApiError(`KMA HTTP ${res.status}`, { code: String(res.status) });
	}
	const json: unknown = await res.json();
	const parsed = vilageFcstResponseSchema.safeParse(json);
	if (!parsed.success) {
		throw new KmaApiError("KMA response schema mismatch", { raw: json });
	}
	const { resultCode, resultMsg } = parsed.data.response.header;
	if (resultCode !== "00") {
		throw new KmaApiError(`KMA result ${resultCode}: ${resultMsg}`, {
			code: resultCode,
			raw: json,
		});
	}
	const items = parsed.data.response.body?.items?.item ?? [];
	return normalizeShortTerm(items);
};
