import { parseJsonRecordsToRaceRecords } from "./race-records-parse";
import type { RaceRecord } from "./types";

export type RaceRecordsBlobVariant = "full" | "kom";

export const raceRecordsBlobQueryKey = (
  eventId: string,
  year: number,
  variant: RaceRecordsBlobVariant = "full",
) => ["race-records-blob", eventId, year, variant] as const;

export async function fetchRaceRecordsBlob(
  blobUrl: string,
  signal?: AbortSignal,
): Promise<RaceRecord[]> {
  const res = await fetch(blobUrl, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const raw = await res.json();
  return parseJsonRecordsToRaceRecords(Array.isArray(raw) ? raw : []);
}
