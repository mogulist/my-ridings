import type { Metadata } from "next";
import { getEventById } from "@/lib/db/events";

type GenerateFindRecordMetadataParams = {
  eventId: string;
  courseId: string;
  year: string;
};

export const generateFindRecordMetadata = async ({
  eventId,
  courseId,
  year,
}: GenerateFindRecordMetadataParams): Promise<Metadata> => {
  const event = await getEventById(eventId);

  if (!event) {
    return {
      title: "페이지를 찾을 수 없습니다 | K-Fondo",
      description: "요청하신 페이지를 찾을 수 없습니다.",
    };
  }

  const course = event.yearDetails?.[Number(year)]?.courses.find(
    (c) => c.id === courseId,
  );
  const courseName = course?.name ?? courseId;

  const title = `${year ? `${year}년 ` : ""}${
    event.location
  } ${courseName} 기록 찾기 | K-Fondo`;
  const description = `${year ? `${year}년 ` : ""}${
    event.location
  } ${courseName}의 기록을 입력하여 순위와 백분율을 확인하세요.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
};
