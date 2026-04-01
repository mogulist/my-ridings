import type { IconNode } from "lucide-react";

import type { NearbyCategoryId } from "./nearbyCategoryId";
import { lucideIconNodeToMarkerGlyphMarkup } from "./lucideIconNodeToSvgMarkup";
import { NEARBY_CATEGORY_LUCIDE_ICON_NODES } from "./nearbyCategoryLucideNodes";

export type KakaoMapsMarkerImageApi = {
  MarkerImage: new (
    src: string,
    size: unknown,
    options?: { offset?: unknown },
  ) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
};

export const KAKAO_MARKER_SIZE = 26;

export function getNearbyCategoryMarkerImage(
  maps: KakaoMapsMarkerImageApi,
  fill: string,
  categoryId: NearbyCategoryId,
): unknown {
  const iconNode = NEARBY_CATEGORY_LUCIDE_ICON_NODES[categoryId];
  return getCategoryMarkerImageFromLucide(maps, fill, iconNode);
}

function getCategoryMarkerImageFromLucide(
  maps: KakaoMapsMarkerImageApi,
  fill: string,
  iconNode: IconNode,
): unknown {
  const size = KAKAO_MARKER_SIZE;
  const r = size / 2;
  const glyph = lucideIconNodeToMarkerGlyphMarkup(iconNode);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${fill}" stroke="#fff" stroke-width="1.3"/>${glyph}</svg>`;
  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new maps.MarkerImage(src, new maps.Size(size, size), {
    offset: new maps.Point(r, r),
  });
}
