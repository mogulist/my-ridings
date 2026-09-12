import { computeRouteDetour, type TrackPoint } from "@my-ridings/plan-geometry";
import {
	type KakaoPlaceDocument,
	type SearchArea,
	searchKakaoLocal,
} from "@/lib/kakao-local-search";
import { findNearbyCategorySearch } from "@/lib/nearby-categories";
import {
	cellKeyFor,
	type GridCell,
	routeCellsInViewport,
	type ViewportBounds,
} from "@/lib/nearby-grid";
import { supabaseAdmin } from "@/lib/supabase";

const KAKAO_CATEGORY_API = "https://dapi.kakao.com/v2/local/search/category.json";
const KAKAO_KEYWORD_API = "https://dapi.kakao.com/v2/local/search/keyword.json";

/** 폐업·개업이 있으므로 영구 캐시는 위험하다. */
export const SCAN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
/** 한 번의 요청이 훑을 수 있는 셀 수. 줌아웃 상태에서 수십 셀이 한꺼번에 도는 것을 막는다. */
export const MAX_CELLS_PER_REQUEST = 8;
export const DEFAULT_MAX_DETOUR_M = 3000;

export type NearbyDocument = {
	id: string;
	place_name: string;
	place_url: string;
	address_name: string;
	road_address_name: string;
	phone: string;
	category_name: string;
	x: string;
	y: string;
	/** 경로 시작점 기준 진행 거리 (m) */
	route_distance_m: number | null;
	/** 경로에서 벗어난 거리 (m) */
	detour_m: number;
};

export type NearbyResult = {
	documents: NearbyDocument[];
	meta: {
		scanned_cells: number;
		served_cells: number;
		is_truncated: boolean;
		kakao_requests: number;
	};
};

/** 셀 하나를 카카오로 훑는다. 마트처럼 키워드가 여럿이면 합쳐서 중복을 제거한다. */
async function scanCell(
	categoryId: string,
	cell: GridCell,
	apiKey: string,
): Promise<{ documents: KakaoPlaceDocument[]; isTruncated: boolean; requestCount: number }> {
	const config = findNearbyCategorySearch(categoryId);
	if (!config) return { documents: [], isTruncated: false, requestCount: 0 };

	const area: SearchArea = {
		kind: "radius",
		lng: cell.centerLng,
		lat: cell.centerLat,
		radiusM: cell.radiusM,
	};

	if (config.keywordQueries?.length) {
		const byId = new Map<string, KakaoPlaceDocument>();
		let isTruncated = false;
		let requestCount = 0;
		for (const query of config.keywordQueries) {
			const outcome = await searchKakaoLocal(KAKAO_KEYWORD_API, apiKey, { query }, area);
			for (const doc of outcome.documents) byId.set(doc.id, doc);
			isTruncated = isTruncated || outcome.isTruncated;
			requestCount += outcome.requestCount;
		}
		return { documents: [...byId.values()], isTruncated, requestCount };
	}

	const outcome = await searchKakaoLocal(
		KAKAO_CATEGORY_API,
		apiKey,
		{ category_group_code: config.categoryGroupCode ?? "AD5" },
		area,
	);
	return {
		documents: outcome.documents,
		isTruncated: outcome.isTruncated,
		requestCount: outcome.requestCount,
	};
}

/**
 * 경로가 화면에서 지나는 셀들의 장소를 돌려준다.
 *
 * 아직 안 훑었거나 오래된 셀만 카카오를 부르고, 결과는 항상 DB에서 읽는다. 캐시가 지리
 * 격자 단위라 라우트를 복제하거나 일부 구간만 겹치는 경우에도 그대로 재활용된다.
 */
export async function fetchNearbyAlongRoute(options: {
	trackPoints: TrackPoint[];
	categoryId: string;
	bounds: ViewportBounds;
	maxDetourM?: number;
	kakaoApiKey: string;
}): Promise<NearbyResult> {
	const { trackPoints, categoryId, bounds, kakaoApiKey } = options;
	const maxDetourM = options.maxDetourM ?? DEFAULT_MAX_DETOUR_M;

	const cells = routeCellsInViewport(trackPoints, bounds).slice(0, MAX_CELLS_PER_REQUEST);
	if (cells.length === 0) {
		return {
			documents: [],
			meta: { scanned_cells: 0, served_cells: 0, is_truncated: false, kakao_requests: 0 },
		};
	}
	const cellKeys = cells.map((cell) => cell.key);

	const { data: scannedRows } = await supabaseAdmin
		.from("nearby_scan_cell")
		.select("cell_key, scanned_at")
		.eq("category", categoryId)
		.in("cell_key", cellKeys);

	const freshCutoff = Date.now() - SCAN_TTL_MS;
	const freshKeys = new Set(
		(scannedRows ?? [])
			.filter((row) => new Date(row.scanned_at).getTime() >= freshCutoff)
			.map((row) => row.cell_key),
	);
	const staleCells = cells.filter((cell) => !freshKeys.has(cell.key));

	let kakaoRequests = 0;
	for (const cell of staleCells) {
		const { documents, isTruncated, requestCount } = await scanCell(categoryId, cell, kakaoApiKey);
		kakaoRequests += requestCount;

		// 검색 원이 셀보다 크므로 이웃 셀의 장소도 딸려온다. 좌표로 셀을 다시 계산해
		// 제자리에 넣어두면 그 이웃 셀을 볼 때 재활용된다.
		const placeRows = documents.flatMap((doc) => {
			const lat = Number(doc.y);
			const lng = Number(doc.x);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
			return [
				{
					provider: "kakao",
					place_id: doc.id,
					category: categoryId,
					cell_key: cellKeyFor(lat, lng),
					place_name: doc.place_name,
					place_url: doc.place_url || null,
					address_name: doc.address_name || null,
					road_address_name: doc.road_address_name || null,
					phone: doc.phone || null,
					category_name: doc.category_name || null,
					lat,
					lng,
					updated_at: new Date().toISOString(),
				},
			];
		});

		if (placeRows.length > 0) {
			await supabaseAdmin
				.from("nearby_place")
				.upsert(placeRows, { onConflict: "provider,place_id,category" });
		}

		await supabaseAdmin.from("nearby_scan_cell").upsert(
			{
				cell_key: cell.key,
				category: categoryId,
				scanned_at: new Date().toISOString(),
				place_count: placeRows.filter((row) => row.cell_key === cell.key).length,
				is_truncated: isTruncated,
			},
			{ onConflict: "cell_key,category" },
		);
	}

	const { data: places, error } = await supabaseAdmin
		.from("nearby_place")
		.select(
			"place_id, place_name, place_url, address_name, road_address_name, phone, category_name, lat, lng",
		)
		.eq("category", categoryId)
		.in("cell_key", cellKeys);
	if (error) throw new Error(error.message);

	// 경로별 값은 저장하지 않고 여기서 계산한다. 라우트가 편집돼도 캐시가 살아 있다.
	const documents = (places ?? [])
		.flatMap((place): NearbyDocument[] => {
			const detour = computeRouteDetour(trackPoints, place.lat, place.lng);
			if (!detour || detour.detourM > maxDetourM) return [];
			return [
				{
					id: place.place_id,
					place_name: place.place_name,
					place_url: place.place_url ?? "",
					address_name: place.address_name ?? "",
					road_address_name: place.road_address_name ?? "",
					phone: place.phone ?? "",
					category_name: place.category_name ?? "",
					x: String(place.lng),
					y: String(place.lat),
					route_distance_m: detour.routeDistanceM,
					detour_m: Math.round(detour.detourM),
				},
			];
		})
		.sort((a, b) => (a.route_distance_m ?? 0) - (b.route_distance_m ?? 0));

	const { data: servedScans } = await supabaseAdmin
		.from("nearby_scan_cell")
		.select("is_truncated")
		.eq("category", categoryId)
		.in("cell_key", cellKeys);

	return {
		documents,
		meta: {
			scanned_cells: staleCells.length,
			served_cells: cells.length,
			is_truncated: (servedScans ?? []).some((row) => row.is_truncated),
			kakao_requests: kakaoRequests,
		},
	};
}
