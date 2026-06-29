/**
 * 에디션에 원본/정렬 기록 JSON을 Vercel Blob에 올리고 event_editions URL·(선택) 상태를 갱신합니다.
 * (어드민 records-upload API와 동일한 Blob 경로 규칙: lib/records-blob-path.ts)
 *
 * 필요 환경 변수(.env.local 우선, 없으면 .env에서 보조 로드):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - BLOB_READ_WRITE_TOKEN
 *
 * 사용 예:
 *   bun run publish:edition-records -- --edition-id <uuid> --records ./data/jeosu_2026.json --sorted ./data/sorted-msec/jeosu_2026.json --status completed
 *   bun run publish:edition-records -- --slug jeosu --year 2026 --kom-records ./data/preliminary/hongcheon_2026_kom.json --kom-sorted ./data/sorted-msec/hongcheon_2026_kom.json --has-kom granfondo
 *   bun run publish:edition-records -- --slug hongcheon --year 2026 --has-kom granfondo
 *   bun run publish:edition-records -- --slug jeosu --year 2026 --records ./data/jeosu_2026.json --sorted ./data/sorted-msec/jeosu_2026.json
 *
 * KOM: --kom-records/--kom-sorted 만으로는 에디션 Blob URL만 갱신됩니다. UI에서 KOM을 쓰려면 --has-kom <course_type> 까지 포함하세요 (docs/events/blob-publish.md).
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { Database } from "../lib/database.types";
import { buildRecordsBlobPath } from "../lib/records-blob-path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(REPO_ROOT, ".env.local") });
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const MAX_SIZE_BYTES = 30 * 1024 * 1024;

const EDITION_STATUS_VALUES = [
  "upcoming",
  "completed",
  "ready",
  "preparing",
  "cancelled",
] as const;

type EditionStatus = (typeof EDITION_STATUS_VALUES)[number];

type CliArgs = {
  editionId?: string;
  slug?: string;
  year?: number;
  records?: string;
  sorted?: string;
  komRecords?: string;
  komSorted?: string;
  status?: EditionStatus;
  /** course_type 목록 — 해당 에디션의 courses.has_kom 을 true 로 설정 */
  hasKomCourseTypes?: string[];
};

const printUsage = () => {
  console.log(`
Usage:
  bun run publish:edition-records -- [options]

필수 (에디션 지정, 택일):
  --edition-id <uuid>           event_editions.id
또는
  --slug <slug> --year <number>  events.slug + 연도

갱신 작업 (하나 이상):
  --records <path>            원본 기록 JSON
  --sorted <path>              sorted-msec JSON
  --kom-records <path>        KOM 원본 기록 JSON
  --kom-sorted <path>         KOM sorted-msec JSON
  --has-kom <types>           콤마로 구분한 course_type (예: granfondo 또는 granfondo,mediofondo).
                              해당 에디션의 courses.has_kom=true 로 갱신합니다.

선택:
  --status <status>            ${EDITION_STATUS_VALUES.join(" | ")}
`);
};

const parseArgs = (argv: string[]): CliArgs => {
  const out: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--edition-id") {
      out.editionId = argv[++i];
    } else if (a === "--slug") {
      out.slug = argv[++i];
    } else if (a === "--year") {
      const y = Number(argv[++i]);
      if (!Number.isFinite(y)) throw new Error("--year 는 숫자여야 합니다.");
      out.year = y;
    } else if (a === "--records") {
      out.records = argv[++i];
    } else if (a === "--sorted") {
      out.sorted = argv[++i];
    } else if (a === "--kom-records") {
      out.komRecords = argv[++i];
    } else if (a === "--kom-sorted") {
      out.komSorted = argv[++i];
    } else if (a === "--has-kom") {
      const raw = argv[++i];
      if (!raw?.trim()) {
        throw new Error("--has-kom 값이 필요합니다 (course_type, 콤마 구분).");
      }
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (!out.hasKomCourseTypes) out.hasKomCourseTypes = [];
      out.hasKomCourseTypes.push(...parts);
    } else if (a === "--status") {
      const s = argv[++i] as EditionStatus;
      if (!EDITION_STATUS_VALUES.includes(s)) {
        throw new Error(
          `--status 는 다음 중 하나여야 합니다: ${EDITION_STATUS_VALUES.join(", ")}`
        );
      }
      out.status = s;
    } else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`알 수 없는 인자: ${a}`);
    }
  }
  return out;
};

const assertJsonPath = (p: string, label: string) => {
  if (!p.toLowerCase().endsWith(".json")) {
    throw new Error(`${label} 경로는 .json 이어야 합니다: ${p}`);
  }
};

const resolveEditionId = async (
  supabase: ReturnType<typeof createClient<Database>>,
  args: CliArgs
): Promise<string> => {
  if (args.editionId) {
    if (args.slug != null || args.year != null) {
      throw new Error("--edition-id 를 쓰면 --slug / --year 를 함께 쓸 수 없습니다.");
    }
    return args.editionId;
  }
  if (args.slug == null || args.year == null) {
    throw new Error("--edition-id 이거나, (--slug 와 --year) 가 필요합니다.");
  }
  const { data: eventRow, error: evErr } = await supabase
    .from("events")
    .select("id")
    .eq("slug", args.slug)
    .single();
  if (evErr) throw new Error(`이벤트 slug 조회 실패: ${evErr.message}`);
  if (!eventRow?.id) throw new Error(`slug 를 찾을 수 없습니다: ${args.slug}`);

  const { data: editionRow, error: edErr } = await supabase
    .from("event_editions")
    .select("id")
    .eq("event_id", eventRow.id)
    .eq("year", args.year)
    .single();
  if (edErr) throw new Error(`에디션 조회 실패: ${edErr.message}`);
  if (!editionRow?.id) {
    throw new Error(
      `에디션을 찾을 수 없습니다: slug=${args.slug} year=${args.year}`
    );
  }
  return editionRow.id;
};

const resolveEventSlug = async (
  supabase: ReturnType<typeof createClient<Database>>,
  editionId: string,
  args: CliArgs
): Promise<string | null> => {
  if (args.slug) return args.slug;
  const { data } = await supabase
    .from("event_editions")
    .select("events(slug)")
    .eq("id", editionId)
    .single();
  const slug = (data?.events as { slug?: string } | null)?.slug;
  return slug ?? null;
};

const main = async () => {
  const argv = process.argv.slice(2);
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    printUsage();
    process.exit(1);
  }

  if (
    !args.records &&
    !args.sorted &&
    !args.komRecords &&
    !args.komSorted &&
    !(args.hasKomCourseTypes && args.hasKomCourseTypes.length > 0)
  ) {
    console.error(
      "❌ --records, --sorted, --kom-records, --kom-sorted, --has-kom 중 하나 이상이 필요합니다.\n"
    );
    printUsage();
    process.exit(1);
  }
  if (args.records) assertJsonPath(args.records, "원본");
  if (args.sorted) assertJsonPath(args.sorted, "정렬");
  if (args.komRecords) assertJsonPath(args.komRecords, "KOM 원본");
  if (args.komSorted) assertJsonPath(args.komSorted, "KOM 정렬");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "❌ .env.local 또는 .env 에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    );
    process.exit(1);
  }
  if (!blobToken) {
    console.error(
      "❌ .env.local 또는 .env 에 BLOB_READ_WRITE_TOKEN 이 필요합니다."
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  const editionId = await resolveEditionId(supabase, args);

  let recordsBlobUrl: string | undefined;
  let sortedRecordsBlobUrl: string | undefined;
  let komRecordsBlobUrl: string | undefined;
  let komSortedRecordsBlobUrl: string | undefined;

  if (args.records) {
    const abs = path.isAbsolute(args.records)
      ? args.records
      : path.join(process.cwd(), args.records);
    const st = await stat(abs);
    if (st.size > MAX_SIZE_BYTES) {
      throw new Error(`원본 파일 용량이 너무 큽니다(최대 30MB): ${abs}`);
    }
    const buf = await readFile(abs);
    const blob = await put(buildRecordsBlobPath(editionId, "records"), buf, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token: blobToken,
    });
    recordsBlobUrl = blob.url;
    console.log("✓ records_blob_url:", recordsBlobUrl);
  }

  if (args.sorted) {
    const abs = path.isAbsolute(args.sorted)
      ? args.sorted
      : path.join(process.cwd(), args.sorted);
    const st = await stat(abs);
    if (st.size > MAX_SIZE_BYTES) {
      throw new Error(`정렬 파일 용량이 너무 큽니다(최대 30MB): ${abs}`);
    }
    const buf = await readFile(abs);
    const blob = await put(
      buildRecordsBlobPath(editionId, "sorted-records"),
      buf,
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        token: blobToken,
      }
    );
    sortedRecordsBlobUrl = blob.url;
    console.log("✓ sorted_records_blob_url:", sortedRecordsBlobUrl);
  }

  if (args.komRecords) {
    const abs = path.isAbsolute(args.komRecords)
      ? args.komRecords
      : path.join(process.cwd(), args.komRecords);
    const st = await stat(abs);
    if (st.size > MAX_SIZE_BYTES) {
      throw new Error(`KOM 원본 파일 용량이 너무 큽니다(최대 30MB): ${abs}`);
    }
    const buf = await readFile(abs);
    const blob = await put(buildRecordsBlobPath(editionId, "kom-records"), buf, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token: blobToken,
    });
    komRecordsBlobUrl = blob.url;
    console.log("✓ kom_records_blob_url:", komRecordsBlobUrl);
  }

  if (args.komSorted) {
    const abs = path.isAbsolute(args.komSorted)
      ? args.komSorted
      : path.join(process.cwd(), args.komSorted);
    const st = await stat(abs);
    if (st.size > MAX_SIZE_BYTES) {
      throw new Error(`KOM 정렬 파일 용량이 너무 큽니다(최대 30MB): ${abs}`);
    }
    const buf = await readFile(abs);
    const blob = await put(
      buildRecordsBlobPath(editionId, "kom-sorted-records"),
      buf,
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        token: blobToken,
      }
    );
    komSortedRecordsBlobUrl = blob.url;
    console.log("✓ kom_sorted_records_blob_url:", komSortedRecordsBlobUrl);
  }

  const patch: Database["public"]["Tables"]["event_editions"]["Update"] = {};
  if (recordsBlobUrl) patch.records_blob_url = recordsBlobUrl;
  if (sortedRecordsBlobUrl) patch.sorted_records_blob_url = sortedRecordsBlobUrl;
  if (komRecordsBlobUrl) patch.kom_records_blob_url = komRecordsBlobUrl;
  if (komSortedRecordsBlobUrl)
    patch.kom_sorted_records_blob_url = komSortedRecordsBlobUrl;
  if (args.status) patch.status = args.status;

  if (Object.keys(patch).length === 0 && !args.hasKomCourseTypes?.length) {
    throw new Error("갱신할 필드가 없습니다.");
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("event_editions")
      .update(patch as never)
      .eq("id", editionId);
    if (error) throw error;

    if (args.status) console.log("✓ status:", args.status);
    console.log("✓ event_editions 갱신 완료. edition id:", editionId);
  } else {
    console.log("ℹ event_editions 변경 없음");
  }

  if (args.hasKomCourseTypes?.length) {
    const unique = [
      ...new Set(
        args.hasKomCourseTypes.map((t) => t.trim()).filter(Boolean),
      ),
    ];
    for (const courseType of unique) {
      const { data, error } = await supabase
        .from("courses")
        .update({ has_kom: true } as never)
        .eq("edition_id", editionId)
        .eq("course_type", courseType)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        console.warn(
          `⚠ has_kom 갱신 대상 없음 (edition 내 course_type 확인): ${courseType}`
        );
      } else {
        console.log("✓ courses.has_kom:", courseType);
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.warn(
      "⚠ NEXT_PUBLIC_SITE_URL 이 없어 /api/revalidate 를 호출하지 않았습니다. 프로덕션 사이트 캐시가 갱신되지 않을 수 있습니다."
    );
  }

  const assertRevalidateOk = async (res: Response, label: string) => {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `revalidate 실패 (${label}): HTTP ${res.status}${text ? ` — ${text}` : ""}`
      );
    }
  };

  if (siteUrl) {
    const slug = await resolveEventSlug(supabase, editionId, args);
    if (slug) {
      const revalidateUrl = `${siteUrl.replace(/\/$/, "")}/api/revalidate`;
      const secret = process.env.REVALIDATE_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (secret) headers.Authorization = `Bearer ${secret}`;
      else {
        console.warn(
          "⚠ REVALIDATE_SECRET 가 없습니다. 프로덕 /api/revalidate 가 시크릿을 요구하면 401이 납니다."
        );
      }

      const fullRevalidate = await fetch(revalidateUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      await assertRevalidateOk(fullRevalidate, "layout 전체");

      const tagRes = await fetch(revalidateUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ tag: `event-${slug}` }),
      });
      await assertRevalidateOk(tagRes, `tag event-${slug}`);

      const pathRes = await fetch(revalidateUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ path: `/${slug}` }),
      });
      await assertRevalidateOk(pathRes, `path /${slug}`);

      console.log(
        `✓ 캐시 revalidate (layout + tag event-${slug} + path /${slug})`,
        slug
      );
    }
  }
};

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
