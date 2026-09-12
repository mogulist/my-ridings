import { describe, expect, test } from "bun:test";
import {
	CELL_LAT_DEG,
	CELL_LNG_DEG,
	cellAt,
	cellFromKey,
	cellKeyFor,
	cellsInViewport,
	routeCellsInViewport,
} from "./nearby-grid";

describe("cellKeyFor", () => {
	test("같은 셀 안의 좌표는 같은 키", () => {
		const a = cellKeyFor(37.5, 127.0);
		const b = cellKeyFor(37.5 + CELL_LAT_DEG * 0.4, 127.0 + CELL_LNG_DEG * 0.4);
		expect(a).toBe(b);
	});

	test("셀 경계를 넘으면 다른 키", () => {
		const a = cellKeyFor(37.5, 127.0);
		const b = cellKeyFor(37.5 + CELL_LAT_DEG, 127.0);
		expect(a).not.toBe(b);
	});

	test("좌표에서만 유도되므로 어느 라우트가 지나든 같은 키", () => {
		// 시작점이 다른 두 라우트가 같은 지점을 지나는 상황
		const routeAPoint = { y: 36.8706, x: 128.5324 };
		const routeBPoint = { y: 36.8706, x: 128.5324 };
		expect(cellKeyFor(routeAPoint.y, routeAPoint.x)).toBe(cellKeyFor(routeBPoint.y, routeBPoint.x));
	});
});

describe("cellAt", () => {
	test("반경이 셀 모서리까지 닿는다", () => {
		const cell = cellAt(Math.floor(37.5 / CELL_LAT_DEG), Math.floor(127.0 / CELL_LNG_DEG));
		// 5km 셀의 절반 대각선은 약 3.5km
		expect(cell.radiusM).toBeGreaterThan(3000);
		expect(cell.radiusM).toBeLessThan(4200);
	});

	test("중심이 셀 안에 있다", () => {
		const latIdx = Math.floor(37.5 / CELL_LAT_DEG);
		const lngIdx = Math.floor(127.0 / CELL_LNG_DEG);
		const cell = cellAt(latIdx, lngIdx);
		expect(cellKeyFor(cell.centerLat, cell.centerLng)).toBe(cell.key);
	});
});

describe("cellFromKey", () => {
	test("키를 되돌리면 같은 셀", () => {
		const original = cellAt(830, 2243);
		const restored = cellFromKey(original.key);
		expect(restored).toEqual(original);
	});

	test("잘못된 키는 null", () => {
		expect(cellFromKey("abc")).toBeNull();
		expect(cellFromKey("1:x")).toBeNull();
	});
});

describe("routeCellsInViewport", () => {
	const track = [
		{ x: 127.0, y: 37.5, d: 0 },
		{ x: 127.0, y: 37.5 + CELL_LAT_DEG * 1.5, d: 7500 },
		// 화면 밖
		{ x: 130.0, y: 40.0, d: 400000 },
	];
	const bounds = { swLng: 126.5, neLng: 127.5, swLat: 37.0, neLat: 38.0 };

	test("화면 안의 경로가 지나는 셀만 돌려준다", () => {
		const cells = routeCellsInViewport(track, bounds);
		expect(cells.length).toBe(2);
		expect(cells.map((c) => c.key)).toContain(cellKeyFor(37.5, 127.0));
	});

	test("중복 셀은 한 번만", () => {
		const dense = [
			{ x: 127.0, y: 37.5, d: 0 },
			{ x: 127.0 + CELL_LNG_DEG * 0.1, y: 37.5 + CELL_LAT_DEG * 0.1, d: 100 },
		];
		expect(routeCellsInViewport(dense, bounds).length).toBe(1);
	});

	test("경로가 화면에 없으면 빈 배열", () => {
		expect(routeCellsInViewport(track, { swLng: 120, neLng: 121, swLat: 33, neLat: 34 })).toEqual(
			[],
		);
	});

	test("d가 없어도 셀은 구해진다", () => {
		const noDistance = [{ x: 127.0, y: 37.5 }];
		expect(routeCellsInViewport(noDistance, bounds).length).toBe(1);
	});
});

describe("cellsInViewport", () => {
	test("화면을 덮는 격자를 모두 돌려준다", () => {
		const bounds = {
			swLat: 37.5,
			neLat: 37.5 + CELL_LAT_DEG * 2,
			swLng: 127.0,
			neLng: 127.0 + CELL_LNG_DEG * 2,
		};
		// 경계 포함이라 3x3
		expect(cellsInViewport(bounds).length).toBe(9);
	});
});
