import { describe, expect, test } from "bun:test";
import { gridToLatLng, latLngToGrid } from "./lcc-grid";

describe("latLngToGrid — KMA 단기예보 격자 공식", () => {
	test("서울시청(37.5665, 126.9780) → (60, 127)", () => {
		expect(latLngToGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
	});

	test("부산시청(35.1796, 129.0756) → (98, 76)", () => {
		expect(latLngToGrid(35.1796, 129.0756)).toEqual({ nx: 98, ny: 76 });
	});

	test("제주시청(33.4996, 126.5312) → (53, 38)", () => {
		expect(latLngToGrid(33.4996, 126.5312)).toEqual({ nx: 53, ny: 38 });
	});

	test("인천시청(37.4563, 126.7052) → (55, 124)", () => {
		expect(latLngToGrid(37.4563, 126.7052)).toEqual({ nx: 55, ny: 124 });
	});

	test("대전시청(36.3504, 127.3845) → (67, 100)", () => {
		expect(latLngToGrid(36.3504, 127.3845)).toEqual({ nx: 67, ny: 100 });
	});
});

describe("gridToLatLng — 역변환", () => {
	test("(60, 127) 중심은 서울 근방이어야 한다", () => {
		const { lat, lng } = gridToLatLng(60, 127);
		expect(lat).toBeGreaterThan(37.4);
		expect(lat).toBeLessThan(37.7);
		expect(lng).toBeGreaterThan(126.8);
		expect(lng).toBeLessThan(127.1);
	});

	test("latLngToGrid → gridToLatLng → latLngToGrid 는 원래 격자로 복귀", () => {
		const original = { nx: 60, ny: 127 };
		const { lat, lng } = gridToLatLng(original.nx, original.ny);
		expect(latLngToGrid(lat, lng)).toEqual(original);
	});

	test("전국 여러 격자 round-trip (격자 → 좌표 → 격자) 일치", () => {
		const cases = [
			{ nx: 55, ny: 124 },
			{ nx: 98, ny: 76 },
			{ nx: 52, ny: 38 },
			{ nx: 67, ny: 100 },
			{ nx: 89, ny: 90 },
		];
		for (const c of cases) {
			const { lat, lng } = gridToLatLng(c.nx, c.ny);
			expect(latLngToGrid(lat, lng)).toEqual(c);
		}
	});
});
