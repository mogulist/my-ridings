import { Icon } from "lucide-react";

import type { NearbyCategoryId } from "./nearbyCategoryId";
import { NEARBY_CATEGORY_LUCIDE_ICON_NODES } from "./nearbyCategoryLucideNodes";

export function nearbyCategoryIcon(categoryId: NearbyCategoryId) {
  const className = "size-4 shrink-0";
  return (
    <Icon
      iconNode={NEARBY_CATEGORY_LUCIDE_ICON_NODES[categoryId]}
      className={className}
      aria-hidden
    />
  );
}
