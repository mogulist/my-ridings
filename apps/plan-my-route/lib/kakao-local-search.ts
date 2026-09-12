/**
 * 카카오 로컬 검색 래퍼.
 *
 * 카카오는 total_count가 얼마든 pageable_count를 45로 제한한다. 밀집 지역에서는
 * 이 한도에 걸려 결과가 조용히 잘리므로, 잘린 영역을 4분할해 다시 훑는다.
 */

const PAGE_SIZE = 15;
const KAKAO_MAX_PAGEABLE = 45;
const MAX_PAGES = Math.ceil(KAKAO_MAX_PAGEABLE / PAGE_SIZE);
/**
 * 0 = 분할 안 함. 카카오 일일 쿼터가 유일한 제약이라 깊이를 1로 묶는다.
 * 깊이 1이면 한 번의 검색이 최악의 경우 1 + 4x3 = 13회 호출이고 최대 180개까지 건진다.
 * 깊이 2로 올리면 63회까지 늘어나 쿼터가 금방 마른다.
 */
const MAX_SUBDIVISION_DEPTH = 1;

const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG_AT_EQUATOR = 111320;

export type KakaoPlaceDocument = {
	id: string;
	place_name: string;
	place_url: string;
	address_name: string;
	road_address_name?: string;
	category_name: string;
	category_group_code: string;
	category_group_name: string;
	phone: string;
	x: string;
	y: string;
	distance?: string;
};

type KakaoResponse = {
	meta: { total_count: number; pageable_count: number; is_end: boolean };
	documents: KakaoPlaceDocument[];
};

export type Rect = {
	swLng: number;
	swLat: number;
	neLng: number;
	neLat: number;
};

export type SearchArea =
	| { kind: "rect"; rect: Rect }
	| { kind: "radius"; lng: number; lat: number; radiusM: number };

export type SearchOutcome = {
	documents: KakaoPlaceDocument[];
	/** 카카오가 보고한 전체 개수 (45개 캡 이전) */
	totalCount: number;
	/** 분할을 다 하고도 여전히 캡에 걸린 영역이 남았는지 */
	isTruncated: boolean;
	/** 카카오에 보낸 HTTP 요청 수 — 쿼터 소모량 확인용 */
	requestCount: number;
};

export function parseRect(value: string): Rect | null {
	const parts = value.split(",").map((piece) => Number(piece.trim()));
	if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
	const [swLng, swLat, neLng, neLat] = parts;
	if (swLng >= neLng || swLat >= neLat) return null;
	return { swLng, swLat, neLng, neLat };
}

function formatRect(rect: Rect): string {
	return `${rect.swLng},${rect.swLat},${rect.neLng},${rect.neLat}`;
}

function splitRect(rect: Rect): Rect[] {
	const midLng = (rect.swLng + rect.neLng) / 2;
	const midLat = (rect.swLat + rect.neLat) / 2;
	return [
		{ swLng: rect.swLng, swLat: rect.swLat, neLng: midLng, neLat: midLat },
		{ swLng: midLng, swLat: rect.swLat, neLng: rect.neLng, neLat: midLat },
		{ swLng: rect.swLng, swLat: midLat, neLng: midLng, neLat: rect.neLat },
		{ swLng: midLng, swLat: midLat, neLng: rect.neLng, neLat: rect.neLat },
	];
}

function metersPerDegreeLng(lat: number): number {
	return METERS_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((lat * Math.PI) / 180);
}

/** 원을 감싸는 최소 사각형. 분할은 사각형 단위로만 한다. */
function radiusToRect(lng: number, lat: number, radiusM: number): Rect {
	const latPadding = radiusM / METERS_PER_DEGREE_LAT;
	const lngPadding = radiusM / Math.max(metersPerDegreeLng(lat), 1e-6);
	return {
		swLng: lng - lngPadding,
		swLat: lat - latPadding,
		neLng: lng + lngPadding,
		neLat: lat + latPadding,
	};
}

function isWithinRadius(
	doc: KakaoPlaceDocument,
	lng: number,
	lat: number,
	radiusM: number,
): boolean {
	const docLng = Number(doc.x);
	const docLat = Number(doc.y);
	if (!Number.isFinite(docLng) || !Number.isFinite(docLat)) return false;
	const dx = (docLng - lng) * metersPerDegreeLng(lat);
	const dy = (docLat - lat) * METERS_PER_DEGREE_LAT;
	return Math.hypot(dx, dy) <= radiusM;
}

function areaParams(area: SearchArea): Record<string, string> {
	if (area.kind === "rect") return { rect: formatRect(area.rect) };
	return {
		x: String(area.lng),
		y: String(area.lat),
		radius: String(Math.round(area.radiusM)),
		// 거리순이면 45개 캡에 걸려도 가까운 곳부터 남는다.
		sort: "distance",
	};
}

async function fetchPage(
	endpoint: string,
	apiKey: string,
	baseParams: Record<string, string>,
	area: SearchArea,
	page: number,
): Promise<KakaoResponse> {
	const params = new URLSearchParams({
		...baseParams,
		...areaParams(area),
		page: String(page),
		size: String(PAGE_SIZE),
	});

	const res = await fetch(`${endpoint}?${params}`, {
		headers: { Authorization: `KakaoAK ${apiKey}` },
		next: { revalidate: 300 },
	});
	if (!res.ok) {
		throw new Error(`Kakao Local API ${res.status}: ${await res.text()}`);
	}
	return (await res.json()) as KakaoResponse;
}

export async function searchKakaoLocal(
	endpoint: string,
	apiKey: string,
	baseParams: Record<string, string>,
	area: SearchArea,
): Promise<SearchOutcome> {
	let requestCount = 0;

	const callPage = async (current: SearchArea, page: number) => {
		requestCount += 1;
		return fetchPage(endpoint, apiKey, baseParams, current, page);
	};

	const search = async (
		current: SearchArea,
		depth: number,
	): Promise<{ documents: KakaoPlaceDocument[]; totalCount: number; isTruncated: boolean }> => {
		// 1페이지가 곧 total_count 정탐이다. 분할할 영역이면 나머지 페이지는 받지 않는다.
		const first = await callPage(current, 1);
		const totalCount = first.meta.total_count;
		const willSubdivide = totalCount > KAKAO_MAX_PAGEABLE && depth < MAX_SUBDIVISION_DEPTH;

		if (!willSubdivide) {
			const documents = [...first.documents];
			let isEnd = first.meta.is_end;
			for (let page = 2; !isEnd && page <= MAX_PAGES; page += 1) {
				const next = await callPage(current, page);
				documents.push(...next.documents);
				isEnd = next.meta.is_end;
			}
			return { documents, totalCount, isTruncated: totalCount > documents.length };
		}

		const rect =
			current.kind === "rect"
				? current.rect
				: radiusToRect(current.lng, current.lat, current.radiusM);
		const quadrants = await Promise.all(
			splitRect(rect).map((quadrant) => search({ kind: "rect", rect: quadrant }, depth + 1)),
		);

		const byId = new Map<string, KakaoPlaceDocument>();
		for (const quadrant of quadrants) {
			for (const doc of quadrant.documents) byId.set(doc.id, doc);
		}
		return {
			documents: [...byId.values()],
			// 최상위 쿼리가 보고한 값이 이 영역의 진짜 총 개수다.
			totalCount,
			isTruncated: quadrants.some((quadrant) => quadrant.isTruncated),
		};
	};

	const result = await search(area, 0);
	const documents =
		area.kind === "radius"
			? result.documents.filter((doc) => isWithinRadius(doc, area.lng, area.lat, area.radiusM))
			: result.documents;

	return {
		documents,
		totalCount: result.totalCount,
		isTruncated: result.isTruncated,
		requestCount,
	};
}

export function resolveSearchArea(searchParams: URLSearchParams): SearchArea | null {
	const x = Number(searchParams.get("x"));
	const y = Number(searchParams.get("y"));
	const radius = Number(searchParams.get("radius"));
	if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(radius) && radius > 0) {
		return { kind: "radius", lng: x, lat: y, radiusM: radius };
	}

	const rectParam = searchParams.get("rect");
	if (!rectParam) return null;
	const rect = parseRect(rectParam);
	return rect ? { kind: "rect", rect } : null;
}
