import { describe, expect, test } from "bun:test";
import type { SummitCatalogRow } from "@/app/types/summitCatalog";
import {
	computeSummitsOnRoute,
	type RwgpsTrackPoint,
} from "./rwgps-plan-markers";

const BASE_LAT = 37.5;
const BASE_LNG = 127.0;

const trackPoints: RwgpsTrackPoint[] = [
	{ x: BASE_LNG, y: BASE_LAT, d: 0, e: 100 },
	{ x: BASE_LNG + 0.01, y: BASE_LAT + 0.01, d: 1500, e: 150 },
];

const summitFixture = (
	overrides: Pick<SummitCatalogRow, "id" | "name" | "lat" | "lng"> &
		Partial<Pick<SummitCatalogRow, "elevation_m">>,
): SummitCatalogRow => ({
	name_normalized: overrides.name.toLowerCase(),
	elevation_m: 200,
	is_official: true,
	status: "approved",
	created_by: null,
	source_route_id: null,
	source_plan_id: null,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
	...overrides,
});

describe("computeSummitsOnRoute", () => {
	test("빈 summits 또는 빈 track이면 []", () => {
		expect(computeSummitsOnRoute([], trackPoints)).toEqual([]);
		expect(
			computeSummitsOnRoute(
				[
					summitFixture({
						id: "s1",
						name: "고개",
						lat: BASE_LAT,
						lng: BASE_LNG,
					}),
				],
				[],
			),
		).toEqual([]);
	});

	test("서밋이 트랙 포인트와 동일 좌표이면 포함", () => {
		const result = computeSummitsOnRoute(
			[
				summitFixture({
					id: "s1",
					name: "정상",
					lat: BASE_LAT,
					lng: BASE_LNG,
				}),
			],
			trackPoints,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("정상");
		expect(result[0]?.passIndex).toBe(0);
		expect(result[0]?.distanceKm).toBe(0);
	});

	test("서밋이 트랙에서 ~100m 이내면 포함", () => {
		const result = computeSummitsOnRoute(
			[
				summitFixture({
					id: "s1",
					name: "근처고개",
					lat: BASE_LAT + 0.0009,
					lng: BASE_LNG,
				}),
			],
			trackPoints,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("근처고개");
	});

	test("서밋이 트랙에서 ~1km+ 떨어지면 제외", () => {
		const result = computeSummitsOnRoute(
			[
				summitFixture({
					id: "s1",
					name: "먼고개",
					lat: BASE_LAT + 0.009,
					lng: BASE_LNG,
				}),
			],
			trackPoints,
		);
		expect(result).toEqual([]);
	});

	test("평지 복도 bbox 안 먼 서밋 다수는 제외하고 가까운 것만 포함", () => {
		const flatTrack: RwgpsTrackPoint[] = Array.from({ length: 20 }, (_, i) => ({
			x: 128.0 + i * 0.01,
			y: 35.5,
			d: i * 5000,
			e: 50,
		}));
		const summits = [
			...Array.from({ length: 8 }, (_, i) =>
				summitFixture({
					id: `far-${i}`,
					name: `먼고개${i}`,
					lat: 35.5 + 0.005,
					lng: 128.0 + i * 0.02,
				}),
			),
			summitFixture({
				id: "near",
				name: "경로고개",
				lat: 35.5 + 0.0005,
				lng: 128.05,
			}),
		];
		const result = computeSummitsOnRoute(summits, flatTrack);
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("경로고개");
	});

	test("왕복 경로에서 같은 서밋을 두 번 지나면 통과마다 마커 생성", () => {
		const summitLat = 37.5;
		const summitLng = 127.0;
		const flatTrack: RwgpsTrackPoint[] = [
			...Array.from({ length: 5 }, (_, i) => ({
				x: summitLng + i * 0.0001,
				y: summitLat,
				d: i * 100,
				e: 100,
			})),
			...Array.from({ length: 50 }, (_, i) => ({
				x: 128 + i * 0.01,
				y: 36,
				d: 5000 + i * 2000,
				e: 50,
			})),
			...Array.from({ length: 5 }, (_, i) => ({
				x: summitLng + i * 0.0001,
				y: summitLat + 0.0005,
				d: 110000 + i * 100,
				e: 200,
			})),
		];
		const result = computeSummitsOnRoute(
			[
				summitFixture({
					id: "guryong",
					name: "구룡령",
					lat: summitLat,
					lng: summitLng,
				}),
			],
			flatTrack,
		);
		expect(result).toHaveLength(2);
		expect(result[0]?.passIndex).toBe(0);
		expect(result[1]?.passIndex).toBe(1);
		expect(result[0]?.distanceKm).toBeLessThan(result[1]!.distanceKm);
	});
});
