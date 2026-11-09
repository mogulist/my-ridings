import { expect, test } from "bun:test";
import type { StravaActivity } from "@/types/strava";
import { rideIsInDateRange } from "./ride-date-range";

const ride = (date: string) =>
	({ start_date: `${date}T12:00:00Z`, start_date_local: `${date}T21:00:00Z` }) as StravaActivity;
const range = { from: "2026-11-04", to: "2026-11-08" };

test.each([
	["before start", "2026-11-03", false],
	["on start", "2026-11-04", true],
	["inside range", "2026-11-06", true],
	["on end", "2026-11-08", true],
	["after end", "2026-11-09", false],
] as const)("ride %s is filtered using inclusive calendar dates", (_, date, expected) => {
	expect(rideIsInDateRange(ride(date), range)).toBe(expected);
});

test("a one-day range includes a ride whose recorded local date differs from its UTC date", () => {
	const activity = {
		start_date: "2026-11-03T15:30:00Z",
		start_date_local: "2026-11-04T00:30:00Z",
	} as StravaActivity;

	expect(rideIsInDateRange(activity, { from: "2026-11-04", to: "2026-11-04" })).toBe(true);
});

test("clearing the range restores rides on all dates", () => {
	expect(rideIsInDateRange(ride("2024-01-01"), null)).toBe(true);
	expect(rideIsInDateRange(ride("2026-11-09"), null)).toBe(true);
});
