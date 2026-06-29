/**
 * 기록으로 찾기 결과 페이지 / OG 이미지 공통 데이터 로직
 */

import { getEventById } from "@/lib/db/events";
import { calculateParticipants, calculateDNF } from "@/lib/participants";
import type { Event } from "@/lib/types";

const COURSE_MAP: Record<string, string> = {
  granfondo: "그란폰도",
  mediofondo: "메디오폰도",
  "challenge-a": "Challenge A",
  "challenge-b": "Challenge B",
  rally: "랠리",
};

export function parseDigitTime(digit: string): string | null {
  if (!/^\d{6,8}$/.test(digit)) return null;
  if (digit.length === 6) {
    return `${digit.slice(0, 2)}:${digit.slice(2, 4)}:${digit.slice(4, 6)}`;
  }
  if (digit.length === 8) {
    return `${digit.slice(0, 2)}:${digit.slice(2, 4)}:${digit.slice(4, 6)}.${digit.slice(6, 8)}`;
  }
  return null;
}

export function timeToMilliseconds(time: string): number {
  if (!time || time === "DNF" || time === "DNS") return -1;
  const [h, m, s] = time.split(":");
  if (!h || !m || !s) return -1;
  let sec = 0,
    ms = 0;
  if (s.includes(".")) {
    const [secStr, msStr] = s.split(".");
    sec = parseInt(secStr, 10);
    ms = parseInt((msStr + "00").slice(0, 3), 10);
  } else {
    sec = parseInt(s, 10);
  }
  return (
    parseInt(h, 10) * 3600 * 1000 +
    parseInt(m, 10) * 60 * 1000 +
    sec * 1000 +
    ms
  );
}

export function msecToTimeString(msec: number): string {
  if (msec < 0) return "-";
  const h = Math.floor(msec / 3600000);
  const m = Math.floor((msec % 3600000) / 60000);
  const s = Math.floor((msec % 60000) / 1000);
  const ms = Math.floor((msec % 1000) / 10);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export function msecDiffToLabel(diffMsec: number): string {
  const abs = Math.abs(diffMsec);
  const sign = diffMsec >= 0 ? "+" : "-";
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  if (h > 0) {
    return `${sign}${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

export type FindByRecordData = {
  event: Event;
  recordScope: FindByRecordScope;
  parsedTime: string;
  rank: number | null;
  percentile: number | null;
  percentileByParticipants: number | null;
  rankMale: number | null;
  rankFemale: number | null;
  percentileMale: number | null;
  percentileFemale: number | null;
  finishersMale: number;
  finishersFemale: number;
  totalParticipants: number;
  finishers: number;
  courseInfo: { name: string; distance: number; elevation: number } | undefined;
  recordsAround: { msec: number; isInput: boolean }[];
  eventDate: string;
};

export type FindByRecordScope = "full" | "kom";

export async function getFindByRecordData(
  eventId: string,
  courseId: string,
  year: string,
  timeDigit: string,
  scope: FindByRecordScope = "full",
): Promise<FindByRecordData | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  const parsedTime = parseDigitTime(timeDigit);
  if (!parsedTime) return null;

  const participants = await calculateParticipants(event, Number(year));
  const dnf = await calculateDNF(event, Number(year));
  const totalParticipants = participants[courseId] ?? 0;
  const totalDNF = dnf[courseId] ?? 0;
  const finishers = totalParticipants - totalDNF;

  const yearDetail = event.yearDetails[Number(year)];
  if (!yearDetail) return null;

  const courseRow = yearDetail.courses?.find((c) => c.id === courseId);
  const hasKomSortedBlob = Boolean(yearDetail.komSortedRecordsBlobUrl?.trim());
  const canUseKom = hasKomSortedBlob && courseRow?.hasKom === true;
  const recordScope: FindByRecordScope =
    scope === "kom" && canUseKom ? "kom" : "full";
  const sortedBlobUrl =
    recordScope === "kom"
      ? yearDetail.komSortedRecordsBlobUrl
      : yearDetail.sortedRecordsBlobUrl;
  if (!sortedBlobUrl) return null;

  let sortedData: Record<string, number[]> = {};
  try {
    const response = await fetch(sortedBlobUrl, {
      next: { revalidate: 3600, tags: [`event-${eventId}`] },
    });
    if (!response.ok) return null;
    sortedData = await response.json();
  } catch {
    return null;
  }

  const courseName = courseRow?.name ?? COURSE_MAP[courseId] ?? courseId;
  const sortedKeys = resolveSortedCourseKeys(sortedData, courseName, recordScope);
  const courseArr: number[] = sortedKeys
    ? sortedData[sortedKeys.course] || []
    : [];
  const maleArr: number[] = sortedKeys
    ? sortedData[sortedKeys.male] || []
    : [];
  const femaleArr: number[] = sortedKeys
    ? sortedData[sortedKeys.female] || []
    : [];
  const inputMsec = timeToMilliseconds(parsedTime);
  if (inputMsec < 0) return null;

  const komFinishers = courseArr.length;
  const effectiveTotalParticipants =
    recordScope === "kom" ? komFinishers : totalParticipants;
  const effectiveFinishers =
    recordScope === "kom" ? komFinishers : finishers;

  const maleStats = rankAndPercentileFromSorted(maleArr, inputMsec);
  const femaleStats = rankAndPercentileFromSorted(femaleArr, inputMsec);

  const closestIdx = courseArr.findIndex((msec) => msec > inputMsec);
  let rank: number | null = null;
  let percentile: number | null = null;
  let percentileByParticipants: number | null = null;
  let recordsAround: { msec: number; isInput: boolean }[] = [];

  if (courseArr.length > 0) {
    const combined = rankAndPercentileFromSorted(courseArr, inputMsec);
    if (combined) {
      rank = combined.rank;
      percentile = combined.percentile;
    }
    if (effectiveTotalParticipants > 0 && rank != null) {
      percentileByParticipants =
        ((rank - 1) / effectiveTotalParticipants) * 100;
    }
    const faster = courseArr.slice(Math.max(0, closestIdx - 10), closestIdx);
    const slower = courseArr.slice(closestIdx, closestIdx + 10);
    recordsAround = [
      ...faster.map((msec) => ({ msec, isInput: false })),
      { msec: inputMsec, isInput: true },
      ...slower.map((msec) => ({ msec, isInput: false })),
    ];
  }

  const courseInfo = courseRow
    ? {
        name: courseRow.name,
        distance: courseRow.distance,
        elevation: courseRow.elevation ?? 0,
      }
    : undefined;
  const eventDate =
    yearDetail.date && /^\d{4}\.\d{1,2}\.\d{1,2}$/.test(yearDetail.date)
      ? (() => {
          const [y, m, d] = yearDetail.date.split(".");
          return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
        })()
      : "";

  return {
    event,
    recordScope,
    parsedTime,
    rank,
    percentile,
    percentileByParticipants,
    rankMale: maleStats?.rank ?? null,
    rankFemale: femaleStats?.rank ?? null,
    percentileMale: maleStats?.percentile ?? null,
    percentileFemale: femaleStats?.percentile ?? null,
    finishersMale: maleArr.length,
    finishersFemale: femaleArr.length,
    totalParticipants: effectiveTotalParticipants,
    finishers: effectiveFinishers,
    courseInfo,
    recordsAround,
    eventDate,
  };
}

function rankAndPercentileFromSorted(
  sortedMs: number[],
  inputMsec: number
): { rank: number; percentile: number } | null {
  if (sortedMs.length === 0) return null;
  const rank = sortedMs.filter((msec) => msec < inputMsec).length + 1;
  const percentile = ((rank - 1) / sortedMs.length) * 100;
  return { rank, percentile };
}

type SortedCourseKeys = {
  course: string;
  male: string;
  female: string;
};

/** sorted-msec JSON 키: 완주는 코스명, KOM은 `그란폰도(kom)` 등 Event 라벨과 동일 */
function normalizeSortedCourseLabel(label: string): string {
  return label.replace(/\s+/g, "").toLowerCase();
}

function resolveSortedCourseKeys(
  sortedData: Record<string, number[]>,
  courseName: string,
  recordScope: FindByRecordScope,
): SortedCourseKeys | null {
  const isGenderKey = (key: string) => key.endsWith("_M") || key.endsWith("_F");

  if (recordScope === "full") {
    if (sortedData[courseName]) {
      return {
        course: courseName,
        male: `${courseName}_M`,
        female: `${courseName}_F`,
      };
    }
    return null;
  }

  const normalizedExpected = normalizeSortedCourseLabel(`${courseName}(kom)`);
  let matched = Object.keys(sortedData).find(
    (key) =>
      !isGenderKey(key) &&
      normalizeSortedCourseLabel(key) === normalizedExpected,
  );
  if (!matched) {
    const coursePrefix = normalizeSortedCourseLabel(courseName);
    matched = Object.keys(sortedData).find((key) => {
      if (isGenderKey(key)) return false;
      const normalizedKey = normalizeSortedCourseLabel(key);
      return (
        normalizedKey.endsWith("(kom)") &&
        normalizedKey.startsWith(coursePrefix)
      );
    });
  }
  if (!matched) return null;

  return {
    course: matched,
    male: `${matched}_M`,
    female: `${matched}_F`,
  };
}
