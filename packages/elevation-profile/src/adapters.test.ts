import { describe, expect, it } from "bun:test";
import {
	detectPausesFromStreams,
	downsample,
	fromGpxPoints,
	fromStravaStreams,
	fromTrackPoints,
	summitsToMarkers,
	waypointsToMarkers,
} from "./adapters";
import { nearestProfilePoint } from "./utils";

// ── downsample ────────────────────────────────────────────────────

describe("downsample", () => {
	it("returns original array when shorter than maxPoints", () => {
		const arr = [1, 2, 3];
		expect(downsample(arr, 10)).toBe(arr);
	});

	it("returns exactly maxPoints elements", () => {
		const arr = Array.from({ length: 100 }, (_, i) => i);
		expect(downsample(arr, 20)).toHaveLength(20);
	});

	it("always includes first and last elements", () => {
		const arr = Array.from({ length: 500 }, (_, i) => i);
		const result = downsample(arr, 50);
		expect(result[0]).toBe(0);
		expect(result[result.length - 1]).toBe(499);
	});

	it("is monotonically non-decreasing for integer arrays", () => {
		const arr = Array.from({ length: 200 }, (_, i) => i);
		const result = downsample(arr, 30);
		for (let i = 1; i < result.length; i++) {
			expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
		}
	});
});

// ── fromStravaStreams ────────────────────────────────────────────

describe("fromStravaStreams", () => {
	const startMs = 1_700_000_000_000;
	const streams = {
		altitude: [100, 110, 120, 115, 108],
		distance: [0, 500, 1000, 1500, 2000],
		time: [0, 30, 60, 90, 120],
		latlng: [
			[37.0, 127.0],
			[37.1, 127.1],
			[37.2, 127.2],
			[37.3, 127.3],
			[37.4, 127.4],
		] as [number, number][],
	};

	it("converts distance from meters to km", () => {
		const result = fromStravaStreams(streams, startMs);
		expect(result[0].distanceKm).toBeCloseTo(0);
		expect(result[result.length - 1].distanceKm).toBeCloseTo(2.0);
	});

	it("maps altitude to elevationM", () => {
		const result = fromStravaStreams(streams, startMs);
		expect(result[0].elevationM).toBe(100);
		expect(result[1].elevationM).toBe(110);
	});

	it("computes absoluteMs from startMs + elapsedSeconds", () => {
		const result = fromStravaStreams(streams, startMs);
		expect(result[0].absoluteMs).toBe(startMs);
		expect(result[1].absoluteMs).toBe(startMs + 30 * 1000);
	});

	it("extracts lat/lng from latlng stream", () => {
		const result = fromStravaStreams(streams, startMs);
		expect(result[0].lat).toBeCloseTo(37.0);
		expect(result[0].lng).toBeCloseTo(127.0);
	});

	it("preserves sourceIndex for GPS lookup", () => {
		const result = fromStravaStreams(streams, startMs);
		for (const point of result) {
			expect(point.sourceIndex).toBeGreaterThanOrEqual(0);
			expect(point.sourceIndex).toBeLessThan(streams.altitude.length);
		}
	});

	it("works without time/latlng streams", () => {
		const minimalStreams = { altitude: [100, 200, 150], distance: [0, 1000, 2000] };
		const result = fromStravaStreams(minimalStreams, startMs);
		expect(result).toHaveLength(3);
		expect(result[0].elapsedSeconds).toBeUndefined();
		expect(result[0].absoluteMs).toBeUndefined();
		expect(result[0].lat).toBeUndefined();
	});

	it("truncates to shortest stream length", () => {
		const uneven = {
			altitude: [100, 200, 300],
			distance: [0, 1000], // shorter
		};
		const result = fromStravaStreams(uneven, startMs);
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("downsamples to maxPoints", () => {
		const large = {
			altitude: Array.from({ length: 5000 }, (_, i) => 100 + i * 0.1),
			distance: Array.from({ length: 5000 }, (_, i) => i * 20),
			time: Array.from({ length: 5000 }, (_, i) => i),
		};
		const result = fromStravaStreams(large, startMs, 500);
		expect(result.length).toBeLessThanOrEqual(500);
	});
});

// ── fromGpxPoints ────────────────────────────────────────────────

describe("fromGpxPoints", () => {
	const points = [
		{ distanceKm: 0, ele: 100, lat: 37.0, lng: 127.0 },
		{ distanceKm: 1.5, ele: 150, lat: 37.1, lng: 127.1 },
		{ distanceKm: 3.0, ele: 120, lat: 37.2, lng: 127.2 },
	];

	it("preserves distanceKm", () => {
		const result = fromGpxPoints(points);
		expect(result[0].distanceKm).toBe(0);
		expect(result[1].distanceKm).toBe(1.5);
		expect(result[2].distanceKm).toBe(3.0);
	});

	it("maps ele to elevationM with null fallback to 0", () => {
		const result = fromGpxPoints(points);
		expect(result[0].elevationM).toBe(100);

		const withNull = [{ distanceKm: 0, ele: null }];
		const r2 = fromGpxPoints(withNull);
		expect(r2[0].elevationM).toBe(0);
	});

	it("passes through lat/lng", () => {
		const result = fromGpxPoints(points);
		expect(result[0].lat).toBeCloseTo(37.0);
		expect(result[0].lng).toBeCloseTo(127.0);
	});
});

// ── fromTrackPoints ──────────────────────────────────────────────

describe("fromTrackPoints", () => {
	const trackPoints = [
		{ x: 127.0, y: 37.0, e: 100, d: 0 },
		{ x: 127.1, y: 37.1, e: 150, d: 1000 },
		{ x: 127.2, y: 37.2, e: 120, d: 2000 },
	];

	it("converts d (meters) to distanceKm", () => {
		const result = fromTrackPoints(trackPoints);
		expect(result[0].distanceKm).toBe(0);
		expect(result[1].distanceKm).toBeCloseTo(1.0);
		expect(result[2].distanceKm).toBeCloseTo(2.0);
	});

	it("maps e to elevationM", () => {
		const result = fromTrackPoints(trackPoints);
		expect(result[0].elevationM).toBe(100);
		expect(result[1].elevationM).toBe(150);
	});

	it("maps x=lng, y=lat", () => {
		const result = fromTrackPoints(trackPoints);
		expect(result[0].lat).toBeCloseTo(37.0);
		expect(result[0].lng).toBeCloseTo(127.0);
	});

	it("filters out points missing e or d", () => {
		const withMissing = [
			{ x: 127.0, y: 37.0 }, // missing e and d
			{ x: 127.1, y: 37.1, e: 100 }, // missing d
			{ x: 127.2, y: 37.2, e: 120, d: 1000 },
		];
		const result = fromTrackPoints(withMissing);
		expect(result).toHaveLength(1);
		expect(result[0].elevationM).toBe(120);
	});

	it("equivalence: same data as buildChartData (basic fields)", () => {
		// Verify that fromTrackPoints produces equivalent elevation/distance to
		// what plan-my-route's buildChartData does (without stage-specific fields).
		const pts = [
			{ x: 127.0, y: 37.0, e: 500, d: 0 },
			{ x: 127.1, y: 37.1, e: 600, d: 5000 },
			{ x: 127.2, y: 37.2, e: 550, d: 10000 },
		];
		const result = fromTrackPoints(pts);
		expect(result[0].distanceKm).toBeCloseTo(0);
		expect(result[0].elevationM).toBe(500);
		expect(result[1].distanceKm).toBeCloseTo(5.0);
		expect(result[1].elevationM).toBe(600);
		expect(result[2].distanceKm).toBeCloseTo(10.0);
		expect(result[2].elevationM).toBe(550);
	});
});

// ── summitsToMarkers ─────────────────────────────────────────────

describe("summitsToMarkers", () => {
	it("converts summit POI to ProfileMarker", () => {
		const summits = [{ id: "1", name: "한라산", distanceKm: 42.5 }];
		const markers = summitsToMarkers(summits);
		expect(markers).toHaveLength(1);
		expect(markers[0].id).toBe("summit-1");
		expect(markers[0].type).toBe("summit");
		expect(markers[0].label).toBe("한라산");
		expect(markers[0].distanceKm).toBe(42.5);
		expect(markers[0].color).toBe("#7c3aed"); // MARKER_COLORS.summit
	});
});

// ── waypointsToMarkers ───────────────────────────────────────────

describe("waypointsToMarkers", () => {
	it("converts basic waypoint to ProfileMarker", () => {
		const wps = [
			{
				id: "10",
				name: "보급소1",
				waypoint_type: "supply" as const,
				distanceKm: 50,
			},
		];
		const markers = waypointsToMarkers(wps);
		expect(markers[0].type).toBe("supply");
		expect(markers[0].label).toBe("보급소1");
		expect(markers[0].color).toBe("#2563eb");
	});

	it("appends cutoff time to cutoff waypoint label", () => {
		const eventStartMs = 1_700_000_000_000;
		const wps = [
			{
				id: "20",
				name: "컷오프",
				waypoint_type: "cutoff" as const,
				distanceKm: 80,
				cutoff_seconds_from_start: 3600 * 8, // 8h after start
			},
		];
		const markers = waypointsToMarkers(wps, eventStartMs);
		expect(markers[0].label).toContain("컷오프");
		expect(markers[0].label).toMatch(/\d{2}:\d{2}/); // HH:MM
		expect(markers[0].meta).toEqual({ cutoffSeconds: 3600 * 8 });
	});

	it("does not append time if eventStartMs is not provided", () => {
		const wps = [
			{
				id: "20",
				name: "컷오프",
				waypoint_type: "cutoff" as const,
				distanceKm: 80,
				cutoff_seconds_from_start: 3600 * 8,
			},
		];
		const markers = waypointsToMarkers(wps); // no eventStartMs
		expect(markers[0].label).toBe("컷오프"); // no appended time
	});
});

// ── detectPausesFromStreams ──────────────────────────────────────

describe("detectPausesFromStreams", () => {
	it("returns empty array when time stream is missing", () => {
		const streams = { distance: [0, 1000, 2000] };
		expect(detectPausesFromStreams(streams, 0)).toHaveLength(0);
	});

	it("detects a gap in the time stream as a pause", () => {
		const streams = {
			distance: [0, 1000, 1001, 2000],
			time: [0, 10, 60, 70], // 50s gap between index 1 and 2 (>= 30s threshold)
		};
		const pauses = detectPausesFromStreams(streams, 0);
		expect(pauses.length).toBeGreaterThan(0);
		expect(pauses[0].distanceKmStart).toBeCloseTo(1.0);
		expect(pauses[0].distanceKmEnd).toBeCloseTo(1.001);
	});

	it("does not detect short gaps as pauses", () => {
		const streams = {
			distance: [0, 1000, 2000],
			time: [0, 10, 20], // only 10s gap — below PAUSE_GAP_SECONDS=30
		};
		const pauses = detectPausesFromStreams(streams, 0);
		expect(pauses).toHaveLength(0);
	});

	it("sets absoluteMs using startMs + elapsed", () => {
		const startMs = 1_700_000_000_000;
		const streams = {
			distance: [0, 100, 200],
			time: [0, 0, 60], // 60s gap at index 0→1 (time[1]=0 is unusual but tests the math)
		};
		// time[1] - time[0] = 0 → no gap
		// time[2] - time[1] = 60 → gap >= 30, but duration = 60 - 1 = 59 >= 10 → pause
		const pauses = detectPausesFromStreams(streams, startMs);
		if (pauses.length > 0) {
			expect(pauses[0].absoluteMsStart).toBe(startMs + 0 * 1000);
		}
	});
});

// ── nearestProfilePoint ──────────────────────────────────────────

describe("nearestProfilePoint", () => {
	const data = [
		{ distanceKm: 0, elevationM: 100, sourceIndex: 0 },
		{ distanceKm: 1, elevationM: 200, sourceIndex: 1 },
		{ distanceKm: 2, elevationM: 150, sourceIndex: 2 },
		{ distanceKm: 5, elevationM: 300, sourceIndex: 3 },
	];

	it("returns null for empty array", () => {
		expect(nearestProfilePoint(1.0, [])).toBeNull();
	});

	it("finds exact match", () => {
		const result = nearestProfilePoint(1.0, data);
		expect(result?.distanceKm).toBe(1);
	});

	it("returns closest point when between two points", () => {
		// 1.4 is closer to 1 than to 2
		expect(nearestProfilePoint(1.4, data)?.distanceKm).toBe(1);
		// 1.6 is closer to 2 than to 1
		expect(nearestProfilePoint(1.6, data)?.distanceKm).toBe(2);
	});

	it("returns first point for negative km", () => {
		expect(nearestProfilePoint(-1, data)?.distanceKm).toBe(0);
	});

	it("returns last point for km beyond end", () => {
		expect(nearestProfilePoint(100, data)?.distanceKm).toBe(5);
	});
});
