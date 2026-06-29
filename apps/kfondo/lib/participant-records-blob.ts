/**
 * Blob URL만으로 기록을 불러옵니다. Node `fs` 없음 — 클라이언트에서 import 가능한 모듈이
 * 이 파일을 거치도록 해야 합니다 (예: eventFilter).
 */

import type { Event } from "./types";

export type ParticipantRecord = {
  BIB_NO: number;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
};

export async function tryFetchParticipantRecordsFromBlob(
  blobUrl: string,
  eventId: string,
  year: number
): Promise<ParticipantRecord[] | null> {
  try {
    const response = await fetch(blobUrl, {
      next: { revalidate: 3600, tags: [`event-${eventId}`] },
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn(`[Participants] Blob fetch failed for ${eventId} ${year}`, error);
    return null;
  }
}

/** 원본 기록 Blob 기준, 해당 연도 전 코스 출발(DNS 제외) 인원 합 */
export async function getTotalParticipantCountForYear(
  event: Event,
  year: number
): Promise<number> {
  const detail = event.yearDetails[year];
  const blobUrl = detail?.recordsBlobUrl?.trim();
  if (!blobUrl) return 0;

  const records = await tryFetchParticipantRecordsFromBlob(blobUrl, event.id, year);
  if (records === null) return 0;

  const courseIdsNames = detail.courses.map((c) => ({ id: c.id, name: c.name }));
  return courseIdsNames.reduce((sum, curr) => {
    const count = records.filter(
      (p) =>
        (p.Event === curr.id || p.Event === curr.name) &&
        p.Status !== "DNS" &&
        p.Status !== "INVALID"
    ).length;
    return sum + count;
  }, 0);
}
