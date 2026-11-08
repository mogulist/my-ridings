import { type Garage, isRide, type Preset, validateConfiguration } from "@/lib/equipment";
import type { StravaActivity } from "@/types/strava";

/** Validate the whole selection before replacing any existing snapshots. */
export function assignPresetToRides(
	garage: Garage,
	rides: StravaActivity[],
	preset: Preset,
): Garage {
	if (!rides.length) throw new Error("배정할 라이딩을 선택해 주세요.");
	if (!garage.presets.some((item) => item.id === preset.id && item.bikeId === preset.bikeId))
		throw new Error("조합이 변경되었습니다. 다시 선택해 주세요.");
	for (const ride of rides) {
		if (!isRide(ride)) throw new Error("라이딩 기록에만 조합을 배정할 수 있습니다.");
		try {
			validateConfiguration(garage, preset.parts, ride.start_date);
		} catch (cause) {
			throw new Error(
				`${ride.name}: ${cause instanceof Error ? cause.message : "부품을 확인해 주세요."}`,
			);
		}
	}
	const ids = new Set(rides.map((ride) => ride.id));
	return {
		...garage,
		assignments: [
			...garage.assignments.filter((assignment) => !ids.has(assignment.activityId)),
			...rides.map((ride) => ({
				activityId: ride.id,
				bikeId: preset.bikeId,
				parts: { ...preset.parts },
			})),
		],
	};
}
