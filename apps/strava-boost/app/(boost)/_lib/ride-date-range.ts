import type { StravaActivity } from "@/types/strava";
import { localDateTime } from "./local-date-time";

export type RideDateRange = { from: string; to: string };

export function rideCalendarDate(ride: StravaActivity) {
	return (ride.start_date_local || localDateTime(new Date(ride.start_date))).slice(0, 10);
}

export function rideIsInDateRange(ride: StravaActivity, range: RideDateRange | null) {
	if (!range) return true;
	const date = rideCalendarDate(ride);
	return range.from <= date && date <= range.to;
}
