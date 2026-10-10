import { analyzeTerrain, snapPlanPoisToTrack } from "@my-ridings/plan-geometry";
import type { RideTerrainPlan } from "./ride-terrain-data";
export function makeTerrainPreviewPlan(scenario = "normal"): RideTerrainPlan {
	const track = Array.from({ length: 601 }, (_, i) => {
		const km = i / 20;
		const e =
			km < 4
				? 120
				: km < 6
					? 120 + 15 * Math.sin((km - 4) * Math.PI * 4)
					: km < 10
						? 120 + (km - 6) * 45
						: km < 13
							? 300 - (km - 10) * 35
							: km < 19
								? 195
								: km < 23
									? 195 + (km - 19) * 40
									: 355 - (km - 23) * 20;
		return {
			x: 127 + km / 100,
			y: 37,
			d: km * 1000,
			e: scenario === "unknown" && km > 7 && km < 8 ? undefined : scenario === "flat" ? 120 : e,
		};
	});
	const stops =
		scenario === "no-supply" || scenario === "empty"
			? []
			: snapPlanPoisToTrack(
					[
						{
							id: "preview-supply",
							name: "CU 강변점",
							poi_type: "convenience",
							memo: null,
							lat: 37,
							lng: 127.15,
						},
					],
					track.map((p) => ({ ...p, e: p.e ?? 0 })),
				);
	const terrain = analyzeTerrain(
		scenario === "empty" ? track.map((p) => ({ ...p, e: 120 })) : track,
	);
	return {
		track,
		threshold: 0,
		stages: [{ id: "preview-stage", startDistanceKm: 0, endDistanceKm: 30 }],
		stops,
		terrain,
		summitMarkers: [
			{
				id: "preview-summit",
				passIndex: 0,
				name: "솔재",
				distanceKm: 10,
				elevation: 300,
				trackPointIndex: 200,
			},
		],
	};
}
