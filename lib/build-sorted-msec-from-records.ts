import { normalizeGenderLabel } from "@/lib/record-gender-filter";

function timeToMilliseconds(time: string): number {
  if (!time || time === "DNF" || time === "DNS") return -1;
  const [h, m, s] = time.split(":");
  if (!h || !m || !s) return -1;
  let sec = 0,
    ms = 0;
  if (s.includes(".")) {
    const [secStr, msStr] = s.split(".");
    sec = parseInt(secStr, 10);
    ms = parseInt(msStr.padEnd(3, "0").slice(0, 3), 10);
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

function getCourseName(record: { Event?: string }) {
  return record.Event || "unknown";
}

function getGenderRaw(record: { Gender?: string }) {
  return typeof record.Gender === "string" ? record.Gender : "";
}

/** 완주 레코드 배열 → 코스별 정렬 전 msec 맵(통합 + `_M` / `_F`). */
export const buildSortedMsecFromRecords = (
  records: unknown[]
): Record<string, number[]> => {
  const courseMap: Record<string, number[]> = {};
  const pushMsec = (key: string, msec: number) => {
    if (!courseMap[key]) courseMap[key] = [];
    courseMap[key].push(msec);
  };

  for (const r of records) {
    const row = r as {
      Time?: string;
      Status?: string;
      Event?: string;
      Gender?: string;
    };
    if (!row.Time || row.Status === "DNF" || row.Status === "DNS") continue;
    const course = getCourseName(row);
    const msec = timeToMilliseconds(row.Time);
    if (msec < 0) continue;

    pushMsec(course, msec);
    const g = normalizeGenderLabel(getGenderRaw(row));
    if (g === "male") pushMsec(`${course}_M`, msec);
    if (g === "female") pushMsec(`${course}_F`, msec);
  }

  for (const key of Object.keys(courseMap)) {
    courseMap[key].sort((a, b) => a - b);
  }
  return courseMap;
};
