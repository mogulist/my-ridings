import type { IconNode } from "lucide-react";
import { __iconNode as bedIconNode } from "lucide-react/dist/esm/icons/bed.js";
import { __iconNode as hotelIconNode } from "lucide-react/dist/esm/icons/hotel.js";
import { __iconNode as coffeeIconNode } from "lucide-react/dist/esm/icons/coffee.js";
import { __iconNode as shoppingCartIconNode } from "lucide-react/dist/esm/icons/shopping-cart.js";
import { __iconNode as storeIconNode } from "lucide-react/dist/esm/icons/store.js";
import { __iconNode as utensilsCrossedIconNode } from "lucide-react/dist/esm/icons/utensils-crossed.js";
import { __iconNode as utensilsIconNode } from "lucide-react/dist/esm/icons/utensils.js";

import type { NearbyCategoryId } from "./nearbyCategoryId";

/** 식당 외 아이콘 후보 — `NEARBY_CATEGORY_LUCIDE_ICON_NODES.restaurant` 에 넣어 교체 */
export const NEARBY_CATEGORY_RESTAURANT_ICON_NODE_ALTERNATES = {
  utensilsCrossed: utensilsCrossedIconNode,
} as const satisfies Record<string, IconNode>;

/** 숙소 외 아이콘 후보 — `NEARBY_CATEGORY_LUCIDE_ICON_NODES.accommodation` 에 넣어 교체 */
export const NEARBY_CATEGORY_ACCOMMODATION_ICON_NODE_ALTERNATES = {
  bed: bedIconNode,
} as const satisfies Record<string, IconNode>;

export const NEARBY_CATEGORY_LUCIDE_ICON_NODES: Record<
  NearbyCategoryId,
  IconNode
> = {
  restaurant: utensilsIconNode,
  cafe: coffeeIconNode,
  convenience: storeIconNode,
  mart: shoppingCartIconNode,
  accommodation: hotelIconNode,
};
