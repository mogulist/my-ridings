import { getStravaLocalTimestamp } from "@/lib/strava-date";
import type { StravaActivity } from "@/src/types";

export type ActivitySortOrder = "date-desc" | "date-asc" | "distance-desc" | "duration-desc";

export const sortActivities = (
	activities: StravaActivity[],
	order: ActivitySortOrder,
): StravaActivity[] => {
	const sorted = [...activities];

	switch (order) {
		case "date-desc":
			return sorted.sort(
				(a, b) =>
					getStravaLocalTimestamp(b.start_date_local) -
					getStravaLocalTimestamp(a.start_date_local),
			);
		case "date-asc":
			return sorted.sort(
				(a, b) =>
					getStravaLocalTimestamp(a.start_date_local) -
					getStravaLocalTimestamp(b.start_date_local),
			);
		case "distance-desc":
			return sorted.sort((a, b) => b.distance - a.distance);
		case "duration-desc":
			return sorted.sort((a, b) => b.moving_time - a.moving_time);
		default:
			return sorted;
	}
};
