import { describe, expect, test } from "bun:test";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import { pointAtRouteProgress } from "./route-point-at-progress";

function makeStraightTrack(): TrackPoint[] {
	const points: TrackPoint[] = [];
	for (let i = 0; i <= 10; i++) {
		points.push({
			d: i * 1000,
			e: 100 + i * 10,
			x: 127 + i * 0.01,
			y: 37 + i * 0.01,
		});
	}
	return points;
}

describe("pointAtRouteProgress", () => {
	test("progress 0 returns start of range", () => {
		const pt = pointAtRouteProgress(makeStraightTrack(), 0, 10, 0);
		expect(pt).not.toBeNull();
		expect(pt!.lng).toBeCloseTo(127, 5);
		expect(pt!.lat).toBeCloseTo(37, 5);
		expect(pt!.distanceM).toBe(0);
	});

	test("progress 1 returns end of range", () => {
		const pt = pointAtRouteProgress(makeStraightTrack(), 0, 10, 1);
		expect(pt).not.toBeNull();
		expect(pt!.lng).toBeCloseTo(127.1, 5);
		expect(pt!.lat).toBeCloseTo(37.1, 5);
		expect(pt!.distanceM).toBe(10_000);
	});

	test("progress 0.5 interpolates midpoint of range", () => {
		const pt = pointAtRouteProgress(makeStraightTrack(), 0, 10, 0.5);
		expect(pt).not.toBeNull();
		expect(pt!.distanceM).toBe(5_000);
		expect(pt!.lng).toBeCloseTo(127.05, 5);
		expect(pt!.lat).toBeCloseTo(37.05, 5);
	});

	test("uses stage sub-range start/end", () => {
		const pt = pointAtRouteProgress(makeStraightTrack(), 2, 8, 0);
		expect(pt).not.toBeNull();
		expect(pt!.distanceM).toBe(2_000);
		expect(pt!.lng).toBeCloseTo(127.02, 5);
	});

	test("clamps progress outside 0..1", () => {
		const start = pointAtRouteProgress(makeStraightTrack(), 0, 10, -1);
		const end = pointAtRouteProgress(makeStraightTrack(), 0, 10, 2);
		expect(start!.distanceM).toBe(0);
		expect(end!.distanceM).toBe(10_000);
	});

	test("returns null when range invalid or track empty", () => {
		expect(pointAtRouteProgress([], 0, 10, 0.5)).toBeNull();
		expect(pointAtRouteProgress(makeStraightTrack(), 5, 5, 0.5)).toBeNull();
		expect(pointAtRouteProgress(makeStraightTrack(), 8, 2, 0.5)).toBeNull();
	});
});
