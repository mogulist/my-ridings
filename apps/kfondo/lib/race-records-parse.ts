import type { RaceRecord } from "./types";
import { timeToSeconds } from "./utils";

/** Blob/JSON 원본 레코드를 `RaceRecord`로 변환 (클라·서버 공용) */
export const parseJsonRecordsToRaceRecords = (rawRecords: unknown[]): RaceRecord[] => {
  return rawRecords.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return {
      bibNo: String(row.BIB_NO),
      gender: typeof row.Gender === "string" ? row.Gender : String(row.Gender ?? ""),
      event: typeof row.Event === "string" ? row.Event : String(row.Event ?? ""),
      time: typeof row.Time === "string" ? row.Time : String(row.Time ?? ""),
      status: typeof row.Status === "string" ? row.Status : String(row.Status ?? ""),
      timeInSeconds: row.Time ? timeToSeconds(String(row.Time)) : undefined,
    };
  });
};
