import type { TrackPoint } from "@my-ridings/plan-geometry";

/**
 * 장소 캐시를 지리 격자 단위로 나눈다.
 *
 * 경로 단위로 캐시하면 같은 길을 지나는 다른 라우트가 재활용을 못 한다. 누적 거리로 자른
 * 구간은 시작점이 다르면 경계가 어긋나므로, 도로가 같아도 절대 매칭되지 않는다. 격자는
 * 좌표에서만 유도되므로 어느 라우트가 지나든 같은 셀을 가리킨다.
 */

/** 셀 한 변의 목표 길이 */
const CELL_SIZE_M = 5000;
const METERS_PER_DEGREE_LAT = 110574;
/** 한국 중위도(37.5N) 기준. 셀이 정사각형에서 조금 벗어나도 캐시 동작에는 영향이 없다. */
const METERS_PER_DEGREE_LNG_AT_REF = 88320;

export const CELL_LAT_DEG = CELL_SIZE_M / METERS_PER_DEGREE_LAT;
export const CELL_LNG_DEG = CELL_SIZE_M / METERS_PER_DEGREE_LNG_AT_REF;

export type GridCell = {
	/** DB 기본키로 쓰는 문자열. 'latIdx:lngIdx' */
	key: string;
	latIdx: number;
	lngIdx: number;
	/** 이 셀을 통째로 덮는 검색 원 */
	centerLat: number;
	centerLng: number;
	radiusM: number;
};

export function cellKeyFor(lat: number, lng: number): string {
	return `${Math.floor(lat / CELL_LAT_DEG)}:${Math.floor(lng / CELL_LNG_DEG)}`;
}

export function cellAt(latIdx: number, lngIdx: number): GridCell {
	const centerLat = (latIdx + 0.5) * CELL_LAT_DEG;
	const centerLng = (lngIdx + 0.5) * CELL_LNG_DEG;
	const halfHeightM = (CELL_LAT_DEG / 2) * METERS_PER_DEGREE_LAT;
	const halfWidthM = (CELL_LNG_DEG / 2) * 111320 * Math.cos((centerLat * Math.PI) / 180);
	return {
		key: `${latIdx}:${lngIdx}`,
		latIdx,
		lngIdx,
		centerLat,
		centerLng,
		// 셀 모서리까지 닿는 원이라야 셀 전체가 검색 범위에 들어온다.
		radiusM: Math.ceil(Math.hypot(halfWidthM, halfHeightM)),
	};
}

export function cellFromKey(key: string): GridCell | null {
	const [latPart, lngPart] = key.split(":");
	const latIdx = Number(latPart);
	const lngIdx = Number(lngPart);
	if (!Number.isInteger(latIdx) || !Number.isInteger(lngIdx)) return null;
	return cellAt(latIdx, lngIdx);
}

export type ViewportBounds = {
	swLng: number;
	swLat: number;
	neLng: number;
	neLat: number;
};

/**
 * 화면 안에 들어오는 경로 위의 셀들.
 *
 * 화면 전체가 아니라 경로가 지나는 셀만 고른다. 경로에서 멀리 떨어진 셀까지 훑으면
 * 라이더에게 쓸모없는 곳에 쿼터를 쓴다.
 */
export function routeCellsInViewport(
	trackPoints: TrackPoint[],
	bounds: ViewportBounds,
): GridCell[] {
	const seen = new Map<string, GridCell>();
	for (const point of trackPoints) {
		if (point.x < bounds.swLng || point.x > bounds.neLng) continue;
		if (point.y < bounds.swLat || point.y > bounds.neLat) continue;
		const latIdx = Math.floor(point.y / CELL_LAT_DEG);
		const lngIdx = Math.floor(point.x / CELL_LNG_DEG);
		const key = `${latIdx}:${lngIdx}`;
		if (!seen.has(key)) seen.set(key, cellAt(latIdx, lngIdx));
	}
	return [...seen.values()];
}

/** 화면을 덮는 모든 셀. 경로와 무관한 지역 검색에 쓴다. */
export function cellsInViewport(bounds: ViewportBounds): GridCell[] {
	const cells: GridCell[] = [];
	const latStart = Math.floor(bounds.swLat / CELL_LAT_DEG);
	const latEnd = Math.floor(bounds.neLat / CELL_LAT_DEG);
	const lngStart = Math.floor(bounds.swLng / CELL_LNG_DEG);
	const lngEnd = Math.floor(bounds.neLng / CELL_LNG_DEG);
	for (let latIdx = latStart; latIdx <= latEnd; latIdx++) {
		for (let lngIdx = lngStart; lngIdx <= lngEnd; lngIdx++) {
			cells.push(cellAt(latIdx, lngIdx));
		}
	}
	return cells;
}
