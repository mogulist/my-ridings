import { courseHasOnlyKomRecords } from "@/lib/record-scope";
import { getEventById } from "@/lib/db/events";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getFindByRecordData } from "@/lib/find-by-record-data";
import { RecordOGImageLandscape } from "@/components/record-og-image-landscape";

export const alt = "K-Fondo result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: Locale; event: string; courseId: string; year: string; time: string }>;
};

async function loadLocalFont(filename: string) {
  const fontPath = join(process.cwd(), "public", "fonts", filename);
  const buffer = await readFile(fontPath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

// 메타데이터 이미지 규약(opengraph-image)은 `params`만 받고 `searchParams`는
// 전달하지 않는다. KOM 전용 코스는 공개된 기록 종류로 판단한다.
export default async function Image(props: Props) {
  const { locale, event: eventId, courseId, year, time } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const sourceEvent = await getEventById(eventId, locale);
  const komOnly = courseHasOnlyKomRecords(sourceEvent?.yearDetails[Number(year)], courseId);
  const data = await getFindByRecordData(eventId, courseId, year, time, komOnly ? "kom" : "full", locale);

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ecfdf5",
          color: "#059669",
          fontSize: 40,
          fontWeight: 800,
        }}
      >
        kfondo.cc
      </div>,
      { ...size },
    );
  }

  const {
    event,
    parsedTime,
    rank,
    percentile,
    percentileByParticipants,
    totalParticipants,
    finishers,
    courseInfo,
    eventDate,
  } = data;

  const eventName = event.name || t("event.defaultName", { v0: event.location });
  const category = courseInfo?.name ?? "";
  const distance = courseInfo ? `${courseInfo.distance}km` : "";
  const elevation = courseInfo ? `${courseInfo.elevation}m` : "";
  const participantPct =
    percentileByParticipants != null ? percentileByParticipants.toFixed(1) : "-";
  const finisherPct = percentile != null ? percentile.toFixed(1) : "-";

  const [fontBold, fontExtraBold, fontHeavy] = await Promise.all([
    loadLocalFont("SUIT-Bold.otf"),
    loadLocalFont("SUIT-ExtraBold.otf"),
    loadLocalFont("SUIT-Heavy.otf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    >
      <RecordOGImageLandscape
        locale={locale}
        year={year}
        eventName={eventName}
        category={category}
        distance={distance}
        elevation={elevation}
        record={parsedTime}
        rank={rank}
        participantPct={participantPct}
        finisherPct={finisherPct}
        totalParticipants={totalParticipants}
        finishers={finishers}
        eventDate={eventDate}
        recordLabel={t(komOnly ? "record.komRecord" : "record.fullRecord")}
        rankLabel={t(komOnly ? "record.komRank" : "record.finishRank")}
        participantLabel={t("stats.byParticipants")}
        finisherLabel={t(komOnly ? "record.komBasis" : "stats.byFinishers")}
        scopeLabel={komOnly ? "KOM" : t("record.full")}
        isKom={komOnly}
        komOnly={komOnly}
      />
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "SUIT",
          data: fontBold,
          weight: 700 as const,
          style: "normal" as const,
        },
        {
          name: "SUIT",
          data: fontExtraBold,
          weight: 800 as const,
          style: "normal" as const,
        },
        {
          name: "SUIT",
          data: fontHeavy,
          weight: 900 as const,
          style: "normal" as const,
        },
      ],
    },
  );
}
