import { ImageResponse } from "next/og";
import type { Locale } from "@/i18n/routing";
import { translator } from "@/i18n/translator";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "K-Fondo";
export default async function Image({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = translator(locale);
  const font = await readFile(join(process.cwd(), "public/fonts/SUIT-Bold.otf"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 80,
        background: "#ecfdf5",
        color: "#059669",
        fontFamily: "SUIT",
      }}
    >
      <div style={{ display: "flex", fontSize: 100, fontWeight: 700 }}>K-Fondo</div>
      <div style={{ display: "flex", fontSize: 38, marginTop: 35 }}>{t("common.tagline")}</div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 50 }}>kfondo.cc</div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "SUIT",
          data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
          weight: 700,
        },
      ],
    },
  );
}
