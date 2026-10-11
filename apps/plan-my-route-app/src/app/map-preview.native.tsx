import PlanMapScreen from "./routes/[routeId]/plans/[planId]/map.native";
import { MAP_PREVIEW_DETAIL } from "@/features/plan-my-route/map-preview-data";
export default function MapPreview() {
	return __DEV__ ? <PlanMapScreen previewDetail={MAP_PREVIEW_DETAIL} /> : null;
}
