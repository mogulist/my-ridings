import type { IconNode } from "lucide-react";

const ATTR_NAME_FOR_SVG: Record<string, string> = {
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  fillRule: "fill-rule",
  clipRule: "clip-rule",
  clipPath: "clip-path",
};

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const toSvgAttrName = (name: string) => ATTR_NAME_FOR_SVG[name] ?? name;

/** 24×24 뷰박스 안 글리프만 축소(마커 원·캔버스 크기는 그대로). */
const MARKER_LUCIDE_GLYPH_SCALE = 0.6;

/** Lucide IconNode → inner SVG elements (svg 루트 제외). React 전용 key 는 제거. */
export function lucideIconNodeToSvgMarkup(iconNode: IconNode): string {
  let out = "";
  for (const [tag, attrs] of iconNode) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "key") continue;
      parts.push(`${toSvgAttrName(k)}="${escapeAttr(String(v))}"`);
    }
    out += `<${tag} ${parts.join(" ")}/>`;
  }
  return out;
}

/** 24×24 글리프를 원 안에 넣기 위한 그룹 (Lucide 기본: stroke 2, round caps). */
export function lucideIconNodeToMarkerGlyphMarkup(iconNode: IconNode): string {
  const inner = lucideIconNodeToSvgMarkup(iconNode);
  return (
    `<g transform="translate(12 12) scale(${MARKER_LUCIDE_GLYPH_SCALE}) translate(-12 -12)" ` +
    `fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `${inner}</g>`
  );
}
