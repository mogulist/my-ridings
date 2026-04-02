import type { IconNode } from "lucide-react";

import { lucideIconNodeToSvgMarkup } from "./lucideIconNodeToSvgMarkup";
import type { KakaoMapsMarkerImageApi } from "./nearbyCategoryMarkerImages";

/** 둥근 사각 마커 (26×26) */
const W = 26;
const H = 26;
const RX = 7;
const GLYPH_SCALE = 0.6;

/** POI·CP 마커 기본 채움색 — 팔레트는 후속 단계에서 조정 */
export const POI_ROUNDED_MARKER_FILL = "#64748b";

function lucideGlyphCentered(iconNode: IconNode, cx: number, cy: number): string {
	const inner = lucideIconNodeToSvgMarkup(iconNode);
	return (
		`<g transform="translate(${cx} ${cy}) scale(${GLYPH_SCALE}) translate(-12 -12)" ` +
		`fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
		`${inner}</g>`
	);
}

export function getPoiRoundedRectMarkerImage(
	maps: KakaoMapsMarkerImageApi,
	iconNode: IconNode,
	fill: string = POI_ROUNDED_MARKER_FILL,
): unknown {
	const cx = W / 2;
	const cy = H / 2;
	const innerW = W - 2.6;
	const innerH = H - 2.6;
	const glyph = lucideGlyphCentered(iconNode, cx, cy);
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
		`<rect x="1.3" y="1.3" width="${innerW}" height="${innerH}" rx="${RX}" ry="${RX}" ` +
		`fill="${fill}" stroke="#fff" stroke-width="1.3"/>` +
		`${glyph}</svg>`;
	const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
	return new maps.MarkerImage(src, new maps.Size(W, H), {
		offset: new maps.Point(cx, cy),
	});
}
