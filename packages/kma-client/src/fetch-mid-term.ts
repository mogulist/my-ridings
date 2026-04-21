import { KmaApiError } from "./kma-errors";
import type { MidLandItem, MidTaItem } from "./mid-term-schema";
import { midLandResponseSchema, midTaResponseSchema } from "./mid-term-schema";

const MID_LAND_ENDPOINT =
	"https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidLandFcst";
const MID_TA_ENDPOINT = "https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidTa";

export type FetchMidInput = {
	regId: string;
	/** "YYYYMMDDHHmm" (KST). 발표시각 (06/18시). */
	tmFc: string;
	authKey: string;
	fetchImpl?: typeof fetch;
};

const callJson = async <T>(
	url: string,
	schema: {
		safeParse: (v: unknown) => { success: true; data: T } | { success: false };
	},
	fetchImpl: typeof fetch,
): Promise<T> => {
	const res = await fetchImpl(url);
	if (!res.ok) {
		throw new KmaApiError(`KMA HTTP ${res.status}`, { code: String(res.status) });
	}
	const json: unknown = await res.json();
	const parsed = schema.safeParse(json);
	if (!parsed.success) {
		throw new KmaApiError("KMA mid-term response schema mismatch", { raw: json });
	}
	return parsed.data;
};

const buildUrl = (endpoint: string, input: FetchMidInput): string => {
	const url = new URL(endpoint);
	url.searchParams.set("authKey", input.authKey);
	url.searchParams.set("pageNo", "1");
	url.searchParams.set("numOfRows", "10");
	url.searchParams.set("dataType", "JSON");
	url.searchParams.set("regId", input.regId);
	url.searchParams.set("tmFc", input.tmFc);
	return url.toString();
};

export const fetchMidLandFcst = async (input: FetchMidInput): Promise<MidLandItem | undefined> => {
	const fetchImpl = input.fetchImpl ?? fetch;
	const data = await callJson(buildUrl(MID_LAND_ENDPOINT, input), midLandResponseSchema, fetchImpl);
	const { resultCode, resultMsg } = data.response.header;
	if (resultCode !== "00") {
		throw new KmaApiError(`KMA result ${resultCode}: ${resultMsg}`, {
			code: resultCode,
		});
	}
	return data.response.body?.items?.item?.[0];
};

export const fetchMidTa = async (input: FetchMidInput): Promise<MidTaItem | undefined> => {
	const fetchImpl = input.fetchImpl ?? fetch;
	const data = await callJson(buildUrl(MID_TA_ENDPOINT, input), midTaResponseSchema, fetchImpl);
	const { resultCode, resultMsg } = data.response.header;
	if (resultCode !== "00") {
		throw new KmaApiError(`KMA result ${resultCode}: ${resultMsg}`, {
			code: resultCode,
		});
	}
	return data.response.body?.items?.item?.[0];
};
