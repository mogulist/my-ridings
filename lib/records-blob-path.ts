import { randomUUID } from "node:crypto";

export type RecordsBlobCategory =
  | "records"
  | "sorted-records"
  | "kom-records"
  | "kom-sorted-records";

/** Vercel Blob 객체 경로 (어드민 `records-upload` API와 동일 규칙) */
export const buildRecordsBlobPath = (
  editionId: string,
  category: RecordsBlobCategory
): string =>
  `${category}/${editionId}-${Date.now()}-${randomUUID()}.json`;
