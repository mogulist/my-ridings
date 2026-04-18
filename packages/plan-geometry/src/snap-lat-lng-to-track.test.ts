import { describe, expect, test } from "bun:test";
import { snapLatLngToTrack } from "./snap-lat-lng-to-track";

describe("snapLatLngToTrack", () => {
	test("빈 트랙이면 null", () => {
		expect(snapLatLngToTrack([], 37.5, 127)).toBeNull();
	});

	test("첫 포인트 좌표에 가깝게 스냅하면 index 0·distanceKm 0", () => {
		const track = [
			{ x: 127.0, y: 37.5, d: 0, e: 10 },
			{ x: 127.01, y: 37.51, d: 1000, e: 15 },
		];
		const r = snapLatLngToTrack(track, 37.5, 127.0);
		expect(r).not.toBeNull();
		expect(r!.index).toBe(0);
		expect(r!.distanceKm).toBe(0);
	});

	test("d 없는 최근접 포인트면 null", () => {
		const track = [{ x: 127.0, y: 37.5 }, { x: 127.01, y: 37.51, d: 1000, e: 10 }];
		expect(snapLatLngToTrack(track, 37.5, 127.0)).toBeNull();
	});
});
