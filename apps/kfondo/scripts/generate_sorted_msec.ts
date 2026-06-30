import fs from "fs";
import path from "path";
import { buildSortedMsecFromRecords } from "../lib/build-sorted-msec-from-records";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_DIR = path.join(DATA_DIR, "sorted-msec");
const PRELIMINARY_DIR = path.join(DATA_DIR, "preliminary");

function parseArgs(argv: string[]) {
  let force = false;
  for (const a of argv) {
    if (a === "--force" || a === "-f") force = true;
  }
  return { force };
}

function main() {
  const { force } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("sorted-msec"));
  for (const file of files) {
    const [eventId, yearWithExt] = file.split("_");
    const year = yearWithExt.replace(".json", "");
    const outputFile = path.join(OUTPUT_DIR, `${eventId}_${year}.json`);
    if (fs.existsSync(outputFile) && !force) {
      console.log(`[SKIP] ${outputFile} already exists.`);
      continue;
    }
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    let records: unknown[] = [];
    try {
      records = JSON.parse(raw) as unknown[];
    } catch {
      console.error(`[ERROR] Failed to parse ${file}`);
      continue;
    }
    const courseMap = buildSortedMsecFromRecords(records);
    fs.writeFileSync(outputFile, JSON.stringify(courseMap, null, 2));
    console.log(`[GENERATED] ${outputFile}`);
  }

  if (fs.existsSync(PRELIMINARY_DIR)) {
    const komFiles = fs
      .readdirSync(PRELIMINARY_DIR)
      .filter((f) => f.endsWith("_kom.json"));
    for (const file of komFiles) {
      const outputFile = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(outputFile) && !force) {
        console.log(`[SKIP] ${outputFile} already exists.`);
        continue;
      }
      const raw = fs.readFileSync(path.join(PRELIMINARY_DIR, file), "utf-8");
      let records: unknown[] = [];
      try {
        records = JSON.parse(raw) as unknown[];
      } catch {
        console.error(`[ERROR] Failed to parse preliminary/${file}`);
        continue;
      }
      const courseMap = buildSortedMsecFromRecords(records);
      fs.writeFileSync(outputFile, JSON.stringify(courseMap, null, 2));
      console.log(`[GENERATED] ${outputFile} (from preliminary/${file})`);
    }
  }
}

main();
