/** Keys match `StageScheduleWaypoint.rowKey` for cp/summit only, e.g. `cp:123`, `summit:uuid`. */
export type ScheduleMarkerMemos = Record<string, string>;

export function normalizeScheduleMarkerMemos(
  raw: unknown,
): ScheduleMarkerMemos | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: ScheduleMarkerMemos = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    if (typeof k === "string" && k.length > 0) out[k] = t;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 한 키만 갱신·삭제(빈 문자열이면 키 제거)한 뒤 정규화. 전부 비면 `null`. */
export function upsertScheduleMarkerMemo(
  existing: unknown,
  rowKey: string,
  memoTrimmed: string,
): ScheduleMarkerMemos | null {
  const prev = normalizeScheduleMarkerMemos(existing) ?? {};
  const next: ScheduleMarkerMemos = { ...prev };
  if (!memoTrimmed) delete next[rowKey];
  else next[rowKey] = memoTrimmed;
  return Object.keys(next).length > 0 ? next : null;
}
