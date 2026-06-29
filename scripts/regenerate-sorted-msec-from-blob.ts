/**
 * DB의 records_blob_url에서 원본을 받아 sorted-msec을 재생성한 뒤 Blob에 올립니다.
 * KOM은 건드리지 않습니다 (--sorted 만 전달).
 *
 * 환경: publish-edition-records 와 동일 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BLOB_READ_WRITE_TOKEN)
 *
 * 사용:
 *   bun run scripts/regenerate-sorted-msec-from-blob.ts
 *   bun run scripts/regenerate-sorted-msec-from-blob.ts -- --slug hongcheon
 *   bun run scripts/regenerate-sorted-msec-from-blob.ts -- --dry-run
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { buildSortedMsecFromRecords } from "../lib/build-sorted-msec-from-records";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(REPO_ROOT, ".env.local") });
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const TMP_RECORDS_DIR = path.join(REPO_ROOT, "data", "tmp", "records");
const TMP_SORTED_DIR = path.join(REPO_ROOT, "data", "tmp", "sorted-msec");

type Row = {
  id: string;
  year: number;
  records_blob_url: string | null;
  events: { slug: string } | { slug: string }[] | null;
};

const parseArgs = (argv: string[]) => {
  let slug: string | undefined;
  let dryRun = false;
  let keepFiles = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") slug = argv[++i];
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--keep-files") keepFiles = true;
    else if (a === "--help" || a === "-h") {
      console.log(`
Usage: bun run scripts/regenerate-sorted-msec-from-blob.ts [-- --slug <slug>] [--dry-run] [--keep-files]
`);
      process.exit(0);
    }
  }
  return { slug, dryRun, keepFiles };
};

const slugFromRow = (row: Row): string | null => {
  const ev = row.events;
  if (!ev) return null;
  if (Array.isArray(ev)) return ev[0]?.slug ?? null;
  return ev.slug ?? null;
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const rmIfExists = (p: string) => {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
};

const main = async () => {
  const { slug: slugFilter, dryRun, keepFiles } = parseArgs(
    process.argv.slice(2)
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다."
    );
    process.exit(1);
  }
  if (!dryRun && !blobToken) {
    console.error("❌ BLOB_READ_WRITE_TOKEN 이 필요합니다 (--dry-run 제외).");
    process.exit(1);
  }

  ensureDir(TMP_RECORDS_DIR);
  ensureDir(TMP_SORTED_DIR);

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  let eventIdFilter: string | undefined;
  if (slugFilter) {
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slugFilter)
      .maybeSingle();
    if (evErr || !ev?.id) {
      console.error(
        `❌ slug 를 찾을 수 없습니다: ${slugFilter}`,
        evErr?.message ?? ""
      );
      process.exit(1);
    }
    eventIdFilter = ev.id;
  }

  let q = supabase
    .from("event_editions")
    .select("id, year, records_blob_url, events!inner(slug)")
    .not("records_blob_url", "is", null);

  if (eventIdFilter) q = q.eq("event_id", eventIdFilter);

  const { data: rows, error } = await q.order("year", { ascending: true });
  if (error) {
    console.error("❌ 조회 실패:", error.message);
    process.exit(1);
  }

  const list = (rows ?? []) as unknown as Row[];
  const editions = list.filter((r) => (r.records_blob_url ?? "").trim());

  console.log(`→ 대상 에디션 ${editions.length}건`);

  const failures: { slug: string; year: number; reason: string }[] = [];

  for (const row of editions) {
    const slug = slugFromRow(row);
    const url = row.records_blob_url?.trim();
    if (!slug || !url) {
      failures.push({
        slug: slug ?? "?",
        year: row.year,
        reason: "slug 또는 records_blob_url 없음",
      });
      continue;
    }

    const recordsPath = path.join(TMP_RECORDS_DIR, `${slug}_${row.year}.json`);
    const sortedPath = path.join(
      TMP_SORTED_DIR,
      `${slug}_${row.year}.json`
    );

    console.log(`\n── ${slug} ${row.year} ──`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`fetch ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      let records: unknown[];
      try {
        records = JSON.parse(text) as unknown[];
      } catch {
        throw new Error("JSON 파싱 실패");
      }
      if (!Array.isArray(records)) {
        throw new Error("원본은 JSON 배열이어야 합니다");
      }

      fs.writeFileSync(recordsPath, text, "utf-8");
      const courseMap = buildSortedMsecFromRecords(records);
      fs.writeFileSync(
        sortedPath,
        JSON.stringify(courseMap, null, 2),
        "utf-8"
      );
      console.log(`  ✓ sorted-msec 생성 (${Object.keys(courseMap).length} keys)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${msg}`);
      failures.push({ slug, year: row.year, reason: msg });
      rmIfExists(recordsPath);
      rmIfExists(sortedPath);
      continue;
    }

    if (dryRun) {
      console.log("  (dry-run) publish 생략");
      if (!keepFiles) {
        rmIfExists(recordsPath);
        rmIfExists(sortedPath);
      }
      continue;
    }

    const r = spawnSync(
      "bun",
      [
        "run",
        path.join("scripts", "publish-edition-records.ts"),
        "--",
        "--slug",
        slug,
        "--year",
        String(row.year),
        "--sorted",
        sortedPath,
      ],
      {
        cwd: REPO_ROOT,
        stdio: "inherit",
        env: { ...process.env },
      }
    );

    if (r.status !== 0) {
      const reason = `publish exit ${r.status}`;
      console.error(`  ✗ ${reason}`);
      failures.push({ slug, year: row.year, reason });
    } else {
      console.log("  ✓ Blob 업로드 및 DB 갱신");
    }

    if (!keepFiles) {
      rmIfExists(recordsPath);
      rmIfExists(sortedPath);
    }
  }

  console.log("\n========== 요약 ==========");
  console.log(`성공: ${editions.length - failures.length} / ${editions.length}`);
  if (failures.length) {
    console.log("실패:");
    for (const f of failures) {
      console.log(`  - ${f.slug} ${f.year}: ${f.reason}`);
    }
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
