import { describe, expect, test } from "bun:test";
import { computeRouteDetour } from "./route-detour";

describe("computeRouteDetour", () => {
	test("빈 트랙이면 null", () => {
		expect(computeRouteDetour([], 37.5, 127)).toBeNull();
	});

	test("경로 위의 점은 이탈거리 0·해당 누적거리", () => {
		const track = [
			{ x: 127.0, y: 37.5, d: 0 },
			{ x: 127.01, y: 37.51, d: 1000 },
		];
		const result = computeRouteDetour(track, 37.51, 127.01);
		expect(result).not.toBeNull();
		expect(result?.index).toBe(1);
		expect(result?.routeDistanceM).toBe(1000);
		expect(result?.detourM).toBeCloseTo(0, 6);
	});

	test("위도 1도 차이는 약 110.6km", () => {
		const track = [{ x: 127.0, y: 37.5, d: 0 }];
		const result = computeRouteDetour(track, 38.5, 127.0);
		expect(result?.detourM).toBeCloseTo(110574, 0);
	});

	test("한국 위도에서 경도 1도는 위도 1도보다 짧게 계산된다", () => {
		const track = [{ x: 127.0, y: 37.5, d: 0 }];
		const eastward = computeRouteDetour(track, 37.5, 128.0)?.detourM ?? 0;
		const northward = computeRouteDetour(track, 38.5, 127.0)?.detourM ?? 0;
		expect(eastward).toBeLessThan(northward);
		expect(eastward).toBeCloseTo(111320 * Math.cos((37.5 * Math.PI) / 180), 0);
	});

	test("d가 없는 트랙이면 routeDistanceM은 null이지만 이탈거리는 나온다", () => {
		const track = [{ x: 127.0, y: 37.5 }];
		const result = computeRouteDetour(track, 37.5, 127.0);
		expect(result?.routeDistanceM).toBeNull();
		expect(result?.detourM).toBeCloseTo(0, 6);
	});

	test("여러 점 중 가장 가까운 점을 고른다", () => {
		const track = [
			{ x: 127.0, y: 37.5, d: 0 },
			{ x: 127.5, y: 37.5, d: 44000 },
			{ x: 128.0, y: 37.5, d: 88000 },
		];
		const result = computeRouteDetour(track, 37.5, 127.48);
		expect(result?.index).toBe(1);
		expect(result?.routeDistanceM).toBe(44000);
	});
});
