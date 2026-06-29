import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getFindByRecordData } from "@/lib/find-by-record-data";
import { RecordOGImageLandscape } from "@/components/record-og-image-landscape";

export const alt = "기록 인증 | K-Fondo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{
    event: string;
    courseId: string;
    year: string;
    time: string;
  }>;
};

async function loadLocalFont(filename: string) {
  const fontPath = join(process.cwd(), "public", "fonts", filename);
  const buffer = await readFile(fontPath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

// 메타데이터 이미지 규약(opengraph-image)은 `params`만 받고 `searchParams`는
// 전달하지 않는다. 따라서 KOM 여부는 쿼리로 알 수 없어 항상 완주(full) 기준으로 그린다.
export default async function Image(props: Props) {
  const { event: eventId, courseId, year, time } = await props.params;
  const data = await getFindByRecordData(eventId, courseId, year, time, "full");

  if (!data) {
    return new ImageResponse(
      (
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
        </div>
      ),
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

  const eventName = event.name || `${event.location} 그란폰도`;
  const category = courseInfo?.name ?? "";
  const distance = courseInfo ? `${courseInfo.distance}km` : "";
  const elevation = courseInfo ? `${courseInfo.elevation}m` : "";
  const participantPct =
    percentileByParticipants != null
      ? percentileByParticipants.toFixed(1)
      : "-";
  const finisherPct = percentile != null ? percentile.toFixed(1) : "-";

  const [fontBold, fontExtraBold, fontHeavy] = await Promise.all([
    loadLocalFont("SUIT-Bold.otf"),
    loadLocalFont("SUIT-ExtraBold.otf"),
    loadLocalFont("SUIT-Heavy.otf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        <RecordOGImageLandscape
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
          recordLabel="완주 기록"
          rankLabel="완주 순위"
          participantLabel="참가자 기준"
          finisherLabel="완주자 기준"
          scopeLabel="완주"
          isKom={false}
        />
      </div>
    ),
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
