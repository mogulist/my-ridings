import * as Linking from "expo-linking";
import RideLiveActivity from "./ride-live-activity.ios";
import { buildRideSupplySnapshot } from "./ride-supply-data";
import { makeTerrainPreviewPlan } from "@/features/plan-my-route/terrain-preview-data";
export async function startTerrainPreviewActivity(scenario: string, km: number | null) {
	if (!__DEV__) return;
	for (const a of RideLiveActivity.getInstances()) await a.end("immediate");
	RideLiveActivity.start(
		buildRideSupplySnapshot(
			makeTerrainPreviewPlan(scenario),
			km == null ? null : { km, timestamp: Date.now() },
		),
		Linking.createURL("/terrain-preview"),
	);
}
export async function endTerrainPreviewActivity() {
	if (!__DEV__) return;
	for (const a of RideLiveActivity.getInstances()) await a.end("immediate");
}
