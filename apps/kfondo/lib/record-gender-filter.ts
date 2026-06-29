import type { RaceRecord } from "./types";

export type GenderSegment = "open" | "male" | "female";

export type NormalizedGenderLabel = "male" | "female" | null;

/** 원본 `Gender` 문자열을 남/여로 정규화. 미분류·알 수 없음은 `null`. */
export const normalizeGenderLabel = (raw: string): NormalizedGenderLabel => {
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "m" || lower === "male" || s === "남") return "male";
  if (
    lower === "f" ||
    lower === "w" ||
    lower === "female" ||
    s === "여"
  )
    return "female";
  return null;
};

/** `open`: 전체 레코드(필터 없음). 그 외: 해당 성별만(미분류는 제외). */
export const filterRaceRecordsByGender = (
  records: RaceRecord[],
  segment: GenderSegment
): RaceRecord[] => {
  if (segment === "open") return records;

  const want: NormalizedGenderLabel = segment;
  return records.filter((r) => normalizeGenderLabel(r.gender) === want);
};
