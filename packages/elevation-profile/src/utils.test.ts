import { describe, expect, it } from "bun:test";
import {
	formatAbsoluteTimeAxis,
	formatAbsoluteTimeTooltip,
	formatDistanceAxis,
	formatRelativeTimeAxis,
	nearestProfilePoint,
	profilePointToXValue,
} from "./utils";

// ── formatDistanceAxis ────────────────────────────────────────────

describe("formatDistanceAxis", () => {
	it("formats whole km without decimal", () => {
		expect(formatDistanceAxis(0)).toBe("0 km");
		expect(formatDistanceAxis(10)).toBe("10 km");
		expect(formatDistanceAxis(100)).toBe("100 km");
	});

	it("formats fractional km with one decimal", () => {
		expect(formatDistanceAxis(1.5)).toBe("1.5 km");
		expect(formatDistanceAxis(42.3)).toBe("42.3 km");
	});

	it("formats 0.0 as whole (0 km)", () => {
		expect(formatDistanceAxis(0.0)).toBe("0 km");
	});
});

// ── formatRelativeTimeAxis ────────────────────────────────────────

describe("formatRelativeTimeAxis", () => {
	it("formats seconds under an hour as 'X분'", () => {
		expect(formatRelativeTimeAxis(0)).toBe("0분");
		expect(formatRelativeTimeAxis(60)).toBe("1분");
		expect(formatRelativeTimeAxis(3540)).toBe("59분");
	});

	it("formats exactly one hour", () => {
		expect(formatRelativeTimeAxis(3600)).toBe("1:00");
	});

	it("formats multi-hour with zero-padded minutes", () => {
		expect(formatRelativeTimeAxis(3660)).toBe("1:01");
		expect(formatRelativeTimeAxis(7200)).toBe("2:00");
		expect(formatRelativeTimeAxis(7260)).toBe("2:01");
		expect(formatRelativeTimeAxis(36000)).toBe("10:00");
	});

	it("pads single-digit minutes", () => {
		// 1h 5m = 3600 + 300 = 3900
		expect(formatRelativeTimeAxis(3900)).toBe("1:05");
	});
});

// ── formatAbsoluteTimeAxis ────────────────────────────────────────

describe("formatAbsoluteTimeAxis", () => {
	it("returns HH:MM format string", () => {
		const result = formatAbsoluteTimeAxis(Date.now());
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("zero-pads hours and minutes", () => {
		// Midnight UTC: getHours() returns local midnight hour
		// Use a value that forces single-digit hour+minute in UTC,
		// but test only the format shape (locale-safe).
		const result = formatAbsoluteTimeAxis(0);
		// Either "00:00" or some other HH:MM depending on local TZ
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});
});

// ── formatAbsoluteTimeTooltip ─────────────────────────────────────

describe("formatAbsoluteTimeTooltip", () => {
	it("returns HH:MM:SS format string", () => {
		const result = formatAbsoluteTimeTooltip(Date.now());
		expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
	});

	it("produces one more colon than formatAbsoluteTimeAxis", () => {
		const ms = Date.now();
		const axis = formatAbsoluteTimeAxis(ms);
		const tooltip = formatAbsoluteTimeTooltip(ms);
		// tooltip has an additional :SS segment
		expect(tooltip.startsWith(axis)).toBe(true);
		expect(tooltip.length).toBe(axis.length + 3); // ":SS"
	});
});

// ── profilePointToXValue ──────────────────────────────────────────

describe("profilePointToXValue", () => {
	const point = {
		distanceKm: 10.5,
		elevationM: 300,
		elapsedSeconds: 1800,
		absoluteMs: 1_700_000_000_000,
		sourceIndex: 0,
	};

	it("returns distanceKm for 'distance' mode", () => {
		expect(profilePointToXValue(point, "distance")).toBe(10.5);
	});

	it("returns elapsedSeconds for 'relative-time' mode", () => {
		expect(profilePointToXValue(point, "relative-time")).toBe(1800);
	});

	it("returns absoluteMs for 'absolute-time' mode", () => {
		expect(profilePointToXValue(point, "absolute-time")).toBe(1_700_000_000_000);
	});

	it("falls back to 0 when elapsedSeconds is missing", () => {
		const noTime = { distanceKm: 5, elevationM: 200, sourceIndex: 0 };
		expect(profilePointToXValue(noTime, "relative-time")).toBe(0);
	});

	it("falls back to 0 when absoluteMs is missing", () => {
		const noAbs = { distanceKm: 5, elevationM: 200, sourceIndex: 0 };
		expect(profilePointToXValue(noAbs, "absolute-time")).toBe(0);
	});
});

// ── nearestProfilePoint (already covered in adapters.test.ts) ────
// Light smoke test for edge cases not in adapters.test.ts

describe("nearestProfilePoint edge cases", () => {
	it("handles single-element array", () => {
		const data = [{ distanceKm: 5, elevationM: 100, sourceIndex: 0 }];
		expect(nearestProfilePoint(0, data)?.distanceKm).toBe(5);
		expect(nearestProfilePoint(99, data)?.distanceKm).toBe(5);
	});

	it("prefers right neighbor when equidistant", () => {
		const data = [
			{ distanceKm: 0, elevationM: 100, sourceIndex: 0 },
			{ distanceKm: 2, elevationM: 200, sourceIndex: 1 },
		];
		// exactly midpoint 1.0 → tied → strict-less condition false → returns right (lo=1)
		const result = nearestProfilePoint(1.0, data);
		expect(result?.distanceKm).toBe(2);
	});
});
