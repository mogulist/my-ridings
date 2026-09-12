import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type KakaoPlaceDocument, searchKakaoLocal } from "./kakao-local-search";

const ENDPOINT = "https://dapi.kakao.com/v2/local/search/category.json";
const PAGE_SIZE = 15;
const KAKAO_MAX_PAGEABLE = 45;

type FakePlace = { id: string; lng: number; lat: number };

let world: FakePlace[] = [];
let requestLog: string[] = [];
const originalFetch = globalThis.fetch;

/** 카카오 로컬을 흉내낸다: rect/radius 필터 + 45개 pageable 상한 + 15개 페이지. */
function fakeKakao(url: string): Response {
	requestLog.push(url);
	const params = new URL(url).searchParams;

	let matched: FakePlace[];
	const rect = params.get("rect");
	if (rect) {
		const [swLng, swLat, neLng, neLat] = rect.split(",").map(Number);
		matched = world.filter(
			(p) => p.lng >= swLng && p.lng <= neLng && p.lat >= swLat && p.lat <= neLat,
		);
	} else {
		const x = Number(params.get("x"));
		const y = Number(params.get("y"));
		const radius = Number(params.get("radius"));
		const mPerLng = 111320 * Math.cos((y * Math.PI) / 180);
		matched = world.filter(
			(p) => Math.hypot((p.lng - x) * mPerLng, (p.lat - y) * 110574) <= radius,
		);
	}

	const page = Number(params.get("page"));
	const pageableCount = Math.min(matched.length, KAKAO_MAX_PAGEABLE);
	const start = (page - 1) * PAGE_SIZE;
	const slice = matched.slice(start, Math.min(start + PAGE_SIZE, pageableCount));

	const documents: KakaoPlaceDocument[] = slice.map((p) => ({
		id: p.id,
		place_name: p.id,
		place_url: "",
		address_name: "",
		category_name: "",
		category_group_code: "AD5",
		category_group_name: "숙박",
		phone: "",
		x: String(p.lng),
		y: String(p.lat),
	}));

	return new Response(
		JSON.stringify({
			meta: {
				total_count: matched.length,
				pageable_count: pageableCount,
				is_end: start + PAGE_SIZE >= pageableCount,
			},
			documents,
		}),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
}

/** rect 안에 고르게 흩뿌린 장소들 */
function scatter(count: number, rect: [number, number, number, number]): FakePlace[] {
	const [swLng, swLat, neLng, neLat] = rect;
	const perSide = Math.ceil(Math.sqrt(count));
	const places: FakePlace[] = [];
	for (let i = 0; i < count; i++) {
		const col = i % perSide;
		const row = Math.floor(i / perSide);
		places.push({
			id: `p${i}`,
			lng: swLng + ((col + 0.5) / perSide) * (neLng - swLng),
			lat: swLat + ((row + 0.5) / perSide) * (neLat - swLat),
		});
	}
	return places;
}

const AREA: [number, number, number, number] = [127.0, 37.5, 127.1, 37.6];

beforeEach(() => {
	requestLog = [];
	globalThis.fetch = ((input: string | URL | Request) =>
		Promise.resolve(fakeKakao(String(input)))) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const searchRect = () =>
	searchKakaoLocal(
		ENDPOINT,
		"test-key",
		{ category_group_code: "AD5" },
		{
			kind: "rect",
			rect: { swLng: AREA[0], swLat: AREA[1], neLng: AREA[2], neLat: AREA[3] },
		},
	);

describe("searchKakaoLocal", () => {
	test("45개 이하면 분할하지 않고 전부 가져온다", async () => {
		world = scatter(20, AREA);
		const result = await searchRect();

		expect(result.documents.length).toBe(20);
		expect(result.totalCount).toBe(20);
		expect(result.isTruncated).toBe(false);
		// 15 + 5 = 2페이지면 끝. 분할 없음.
		expect(result.requestCount).toBe(2);
	});

	test("45개를 넘으면 4분할해서 45개보다 많이 건진다", async () => {
		world = scatter(120, AREA);
		const result = await searchRect();

		expect(result.totalCount).toBe(120);
		expect(result.documents.length).toBeGreaterThan(KAKAO_MAX_PAGEABLE);
		expect(result.isTruncated).toBe(false);
	});

	test("분할하는 영역은 1페이지만 정탐하고 나머지 페이지를 받지 않는다", async () => {
		world = scatter(120, AREA);
		const result = await searchRect();

		const parentRequests = requestLog.filter((url) => {
			const rect = new URL(url).searchParams.get("rect");
			return rect === `${AREA[0]},${AREA[1]},${AREA[2]},${AREA[3]}`;
		});
		expect(parentRequests.length).toBe(1);
		// 부모 1회 + 사분면 4개 x 최대 3페이지
		expect(result.requestCount).toBeLessThanOrEqual(13);
	});

	test("중복 id는 한 번만 남는다", async () => {
		world = scatter(120, AREA);
		const result = await searchRect();

		const ids = result.documents.map((doc) => doc.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("깊이 1을 넘지 않으므로 아주 밀집하면 여전히 잘림으로 보고한다", async () => {
		// 사분면 하나에 45개를 초과해 몰아넣는다.
		world = scatter(400, AREA);
		const result = await searchRect();

		expect(result.totalCount).toBe(400);
		expect(result.isTruncated).toBe(true);
		expect(result.requestCount).toBeLessThanOrEqual(13);
	});

	test("반경 검색은 원 밖의 결과를 걸러낸다", async () => {
		world = scatter(20, AREA);
		const result = await searchKakaoLocal(
			ENDPOINT,
			"test-key",
			{ category_group_code: "AD5" },
			{ kind: "radius", lng: 127.05, lat: 37.55, radiusM: 500 },
		);

		const mPerLng = 111320 * Math.cos((37.55 * Math.PI) / 180);
		for (const doc of result.documents) {
			const distance = Math.hypot(
				(Number(doc.x) - 127.05) * mPerLng,
				(Number(doc.y) - 37.55) * 110574,
			);
			expect(distance).toBeLessThanOrEqual(500);
		}
	});

	test("반경 검색은 거리순 정렬을 요청한다", async () => {
		world = scatter(20, AREA);
		await searchKakaoLocal(
			ENDPOINT,
			"test-key",
			{ category_group_code: "AD5" },
			{ kind: "radius", lng: 127.05, lat: 37.55, radiusM: 3000 },
		);

		expect(new URL(requestLog[0]).searchParams.get("sort")).toBe("distance");
	});
});
