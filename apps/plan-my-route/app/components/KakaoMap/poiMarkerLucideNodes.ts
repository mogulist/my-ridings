import type { IconNode } from "lucide-react";
import { __iconNode as mapPinIconNode } from "lucide-react/dist/esm/icons/map-pin.js";
import { __iconNode as squareCheckBigIconNode } from "lucide-react/dist/esm/icons/square-check-big.js";

import { isPlanPoiType } from "@/app/types/planPoi";
import { NEARBY_CATEGORY_LUCIDE_ICON_NODES } from "./nearbyCategoryLucideNodes";

type RwgpsPoiLike = { poi_type_name: string };

export function isRwgpsControlPoi(poi: RwgpsPoiLike): boolean {
	return poi.poi_type_name?.trim().toLowerCase() === "control";
}

export function lucideIconNodeForRwgpsPoi(poi: RwgpsPoiLike): IconNode {
	return isRwgpsControlPoi(poi) ? squareCheckBigIconNode : mapPinIconNode;
}

export function lucideIconNodeForPlanPoiType(poiType: string): IconNode {
	if (isPlanPoiType(poiType)) return NEARBY_CATEGORY_LUCIDE_ICON_NODES[poiType];
	return mapPinIconNode;
}
