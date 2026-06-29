#!/usr/bin/env node

import axios from "axios";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";

dotenv.config({ path: ".env.local" });
dotenv.config();

type Record = {
  BIB_NO: string;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
  StartTime?: string;
  FinishTime?: string;
  Name?: string;
  Speed?: string;
  KOM_TIME?: string;
};

type RaceResultRow = {
  bib: string;
  name: string;
  group: string;
  start: string;
  kom1Start: string;
  kom1Arrive: string;
  komLastFinish: string;
  komSegmentTime: string;
  finish: string;
  kom1: string;
  speed: string;
  result: string;
  category: string;
  eventLabel: string;
  genderField: string;
};

type FieldIndices = {
  bib: number;
  lastName: number;
  group: number;
  start: number;
  komStart: number;
  komFinish: number;
  komLastFinish: number;
  komChip: number;
  komSegmentTime: number;
  finish: number;
  speed: number;
  result: number;
  gender: number;
};

const OKJEONGHO_RESULTS_LISTS: { listname: string; eventLabel: string }[] = [
  { listname: "Online|그란폰도", eventLabel: "그란폰도" },
  { listname: "Online|메디오폰도", eventLabel: "메디오폰도" },
];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveOutputFile(outputPath?: string): string {
  if (outputPath) {
    return path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath);
  }
  return path.join(process.cwd(), "data", "iksan_2025.json");
}

function findField(dataFields: string[], ...candidates: (string | RegExp)[]): number {
  for (const c of candidates) {
    const i = typeof c === "string"
      ? dataFields.indexOf(c)
      : dataFields.findIndex((f) => c.test(f));
    if (i >= 0) return i;
  }
  return -1;
}

function buildFieldIndices(dataFields: string[]): FieldIndices {
  const req = (...candidates: (string | RegExp)[]): number => {
    const i = findField(dataFields, ...candidates);
    if (i < 0) throw new Error(`DataFields missing required column: ${candidates.join(" | ")}`);
    return i;
  };
  const komStart = dataFields.findIndex((f) => /^Kom\d+start\.TOD$/i.test(f));
  const komFinish = dataFields.findIndex((f) => /^Kom\d+finish\.TOD$/i.test(f));
  // 가장 큰 번호의 KomN finish 칩 (예: KOM1/KOM2가 모두 있으면 KOM2 finish) — 마지막 KOM 구간 통과 여부/시각
  const komFinishCandidates = dataFields
    .map((f, i) => ({ i, m: f.match(/^Kom(\d+)finish\.TOD$/i) }))
    .filter((x) => x.m);
  const komLastFinish =
    komFinishCandidates.length > 0
      ? komFinishCandidates.sort((a, b) => Number(b.m![1]) - Number(a.m![1]))[0].i
      : -1;
  // 완주 판정용 KOM 통과 칩: "Kom1.TOD"처럼 정확히 일치하는 필드가 있으면 사용,
  // 없으면(예: 그란폰도 - Kom2finish.TOD만 존재) 마지막 KOM finish 칩으로 대체
  const komChipExact = dataFields.findIndex((f) => /^Kom\d+\.TOD$/i.test(f));
  const komChip = komChipExact >= 0 ? komChipExact : komLastFinish;
  // KOM 구간 기록(랭킹 리스트)용 합산 시간 필드: "Kom1", "KOM1&2" 등
  const komSegmentTime = dataFields.findIndex((f) => /^Kom[\d&]+$/i.test(f));
  const speed = dataFields.indexOf("Finish.SPEED");

  return {
    bib: req("BIB"),
    lastName: req("LASTNAME"),
    group: req("Group"),
    start: req("Start.TOD", /Format\(\[Start/i),
    komStart,
    komFinish,
    komLastFinish,
    komChip,
    komSegmentTime,
    finish: req("Finish.TOD", /Format\(\[Finish/i),
    speed,
    result: req("Finish.CHIP", "Race Time Total"),
    gender: findField(dataFields, "GenderMF"),
  };
}

function inferEventFromListName(listName: string): string {
  const lower = listName.toLowerCase();
  const base =
    lower.includes("medio") || listName.includes("메디오")
      ? "메디오폰도"
      : lower.includes("gran") || listName.includes("그란")
      ? "그란폰도"
      : "메디오폰도";
  const isKom = lower.includes("kom");
  return isKom ? `${base}(kom)` : base;
}

async function fetchConfig(eventId: string): Promise<{
  key: string;
  server: string;
  lists: Array<{ Name: string; ID: string }>;
}> {
  try {
    const url = `https://my.raceresult.com/${eventId}/RRPublish/data/config?lang=en&page=results&v=1`;
    const response = await axios.get(url);
    if (response.data?.lists?.length) {
      return response.data;
    }
    throw new Error("RRPublish config returned no lists");
  } catch {
    // RRPublish/data/config가 없는 이벤트 — results/config의 TabConfig.Lists로 대체
    const url = `https://my.raceresult.com/${eventId}/results/config?lang=en`;
    const response = await axios.get(url);
    const data = response.data;
    const lists: Array<{ Name: string; ID: string }> = (
      data.TabConfig?.Lists || data.Tab?.Config?.Lists || []
    ).map((l: { Name: string; ID: string }) => ({ Name: l.Name, ID: l.ID }));
    return { key: data.key, server: data.server, lists };
  }
}

function listRequestHeaders(): Record<string, string> {
  return {
    Accept: "*/*",
    Origin: "https://my.raceresult.com",
    Referer: "https://my.raceresult.com/",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
}

async function fetchListDataRrpublish(
  eventId: string,
  server: string,
  key: string,
  listName: string,
  limit: number = 9999
): Promise<any> {
  const listname = encodeURIComponent(listName);
  const url = `https://${server}/${eventId}/RRPublish/data/list?key=${key}&listname=${listname}&page=results&contest=0&r=leaders&l=${limit}`;

  try {
    const response = await axios.get(url, { headers: listRequestHeaders() });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`List not found: ${listName}, skipping...`);
      return null;
    }
    console.error(`Error fetching list data for ${listName}:`, error.message);
    return null;
  }
}

async function fetchListDataResultsList(
  eventId: string,
  server: string,
  key: string,
  listName: string,
  limit: number = 9999
): Promise<any> {
  const params = new URLSearchParams({
    key,
    listname: listName,
    page: "results",
    contest: "0",
    r: "leaders",
    l: String(limit),
    openedGroups: "{}",
    term: "",
  });
  const url = `https://${server}/${eventId}/results/list?${params.toString()}`;

  try {
    const response = await axios.get(url, { headers: listRequestHeaders() });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`List not found: ${listName}, skipping...`);
      return null;
    }
    console.error(`Error fetching results/list for ${listName}:`, error.message);
    return null;
  }
}

function parseListData(
  apiResponse: any,
  eventLabel: string
): RaceResultRow[] {
  const rows: RaceResultRow[] = [];

  if (!apiResponse || !apiResponse.data) {
    return rows;
  }

  const dataFields: string[] = apiResponse.DataFields || [];
  if (dataFields.length === 0) {
    console.warn("parseListData: empty DataFields");
    return rows;
  }

  let indices: FieldIndices;
  try {
    indices = buildFieldIndices(dataFields);
  } catch (e) {
    console.error("parseListData: failed to map DataFields", e);
    return rows;
  }

  const data = apiResponse.data;

  for (const contestKey in data) {
    const contestData = data[contestKey];
    for (const categoryKey in contestData) {
      const categoryRows = contestData[categoryKey];
      if (!Array.isArray(categoryRows)) continue;

      const category = categoryKey.replace(/^#\d+_/, "");

      for (let i = 0; i < categoryRows.length - 1; i++) {
        const row = categoryRows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        if (row.length === 1 && typeof row[0] === "number") continue;

        const cell = (idx: number) =>
          idx >= 0 && idx < row.length
            ? row[idx]?.toString().trim() || ""
            : "";
        // RaceResult는 시간 필드의 소수부 구분자로 ","를 쓰는 경우가 있어 "."로 정규화
        const cellTime = (idx: number) => cell(idx).replace(",", ".");

        const bib = cell(indices.bib);
        const lastName = cell(indices.lastName);
        const group = cell(indices.group);
        const start = cellTime(indices.start);
        const kom1Start = cellTime(indices.komStart);
        const kom1Arrive = cellTime(indices.komFinish);
        const komLastFinish = cellTime(indices.komLastFinish);
        const komSegmentTime = cellTime(indices.komSegmentTime);
        const finish = cellTime(indices.finish);
        const kom1 = cellTime(indices.komChip);
        const speed =
          indices.speed >= 0 ? cell(indices.speed) : "";
        const result = cellTime(indices.result);
        const genderField = indices.gender >= 0 ? cell(indices.gender) : "";

        if (bib && lastName && bib.match(/^\d+$/)) {
          rows.push({
            bib,
            name: lastName,
            group,
            start,
            kom1Start,
            kom1Arrive,
            komLastFinish,
            komSegmentTime,
            finish,
            kom1,
            speed,
            result,
            category,
            eventLabel,
            genderField,
          });
        }
      }
    }
  }

  return rows;
}

function convertToRecord(row: RaceResultRow): Record {
  const gender = row.category.includes("(여)")
    ? "F"
    : row.category.includes("(남)")
    ? "M"
    : row.genderField === "F" || row.genderField === "W"
    ? "F"
    : row.genderField === "M"
    ? "M"
    : "";
  const event = row.eventLabel;

  const hasStartTime =
    row.start && row.start !== "" && !row.start.includes("_");
  const hasFinishTime =
    row.finish && row.finish !== "" && !row.finish.includes("_");

  // KOM 구간 랭킹 리스트(예: "그란폰도(kom)") — 구간 합산 시간을 Time으로 기록
  if (event.endsWith("(kom)")) {
    const hasSegTime =
      row.komSegmentTime !== "" && !row.komSegmentTime.includes("_");
    const hasSegStart =
      row.kom1Start !== "" && !row.kom1Start.includes("_");
    const hasSegFinish =
      row.komLastFinish !== "" && !row.komLastFinish.includes("_");

    return {
      BIB_NO: row.bib,
      Gender: gender,
      Event: event,
      Time: hasSegTime ? row.komSegmentTime : "",
      Status: hasSegTime ? "" : hasStartTime ? "DNF" : "DNS",
      StartTime: hasSegStart ? row.kom1Start : undefined,
      FinishTime: hasSegFinish ? row.komLastFinish : undefined,
      Name: row.name,
    };
  }

  const chipOk =
    row.result && row.result !== "" && !row.result.includes("_");
  // DataFields의 Kom2.TOD(그란) / Kom1.TOD(메디오) — 구간 칩이 있어야 해당 코스 완주로 본다
  const komChipOk =
    row.kom1 && row.kom1 !== "" && !row.kom1.includes("_");
  const needsKomForFinish =
    event === "그란폰도" || event === "메디오폰도";
  // 출발 기록이 없으면 도착/구간 칩 유무와 무관하게 DNS로 본다
  const completed =
    hasStartTime && chipOk && (!needsKomForFinish || komChipOk);

  return {
    BIB_NO: row.bib,
    Gender: gender,
    Event: event,
    Time: completed ? row.result : "",
    Status: completed ? "" : hasStartTime ? "DNF" : "DNS",
    StartTime: hasStartTime ? row.start : undefined,
    FinishTime: hasFinishTime ? row.finish : undefined,
    Name: row.name,
    Speed: row.speed ? `${row.speed}km/h` : undefined,
    KOM_TIME: komChipOk ? row.kom1 : undefined,
  };
}

function recordDedupeKey(r: Record): string {
  return `${r.BIB_NO}\t${r.Event}`;
}

type ScrapeOptions = {
  useResultsList: boolean;
  listHostOverride?: string;
  eventLabelOverride?: string;
};

async function scrapeRaceResult(
  eventId: string,
  keyArg: string,
  outputPath?: string,
  maxRetries: number = 3,
  scrapeOptions: ScrapeOptions = { useResultsList: false }
): Promise<void> {
  const outputFile = resolveOutputFile(outputPath);
  // "(kom)" 이벤트(KOM 구간 랭킹)는 별도 *_kom.json 파일에 저장
  const komOutputFile = outputFile.replace(/\.json$/, "_kom.json");

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const loadRecords = (file: string): Record[] => {
    if (!fs.existsSync(file)) return [];
    try {
      const content = fs.readFileSync(file, "utf-8");
      return content ? (JSON.parse(content) as Record[]) : [];
    } catch (error) {
      console.warn(
        `Failed to load existing records from ${file}. Starting fresh.`,
        error
      );
      return [];
    }
  };

  let records = loadRecords(outputFile);
  let komRecords = loadRecords(komOutputFile);

  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
  }

  const processedKeys = new Set(
    [...records, ...komRecords].map(recordDedupeKey)
  );

  console.log(`Starting to scrape Race Result event ${eventId}`);
  console.log(`Results will be saved to: ${outputFile}`);
  console.log(`KOM segment records will be saved to: ${komOutputFile}`);
  console.log(
    `Already processed records: ${processedKeys.size} (will be skipped)`
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Fetching config (attempt ${attempt + 1}/${maxRetries})...`);
      const config = await fetchConfig(eventId);

      const server =
        scrapeOptions.listHostOverride ||
        process.env.RACERESULT_LIST_HOST ||
        config.server ||
        "my3.raceresult.com";
      const apiKey =
        keyArg ||
        process.env.RACERESULT_KEY ||
        config.key;

      if (!apiKey) {
        throw new Error(
          "API key not found: pass key argument, set RACERESULT_KEY, or rely on public config.key"
        );
      }

      console.log(`Server: ${server}`);
      console.log(`Using results/list API: ${scrapeOptions.useResultsList}`);

      const allRows: RaceResultRow[] = [];

      if (scrapeOptions.useResultsList) {
        // config lists를 우선 사용, 없으면 옥정호 하드코딩 폴백
        const listsToFetch: { listname: string; eventLabel: string }[] =
          config.lists?.length
            ? config.lists.map((l: { Name: string }) => ({
                listname: l.Name,
                eventLabel: scrapeOptions.eventLabelOverride ?? inferEventFromListName(l.Name),
              }))
            : OKJEONGHO_RESULTS_LISTS;

        console.log(`Available lists: ${listsToFetch.map((l) => l.listname).join(", ")}`);

        for (const { listname, eventLabel } of listsToFetch) {
          console.log(`Fetching results/list: ${listname} → Event "${eventLabel}"...`);
          const listData = await fetchListDataResultsList(
            eventId,
            server,
            apiKey,
            listname,
            9999
          );
          if (!listData) {
            console.log(`Skipping list: ${listname}`);
            continue;
          }
          const rows = parseListData(listData, eventLabel);
          console.log(`Found ${rows.length} rows from ${listname}`);
          allRows.push(...rows);
          await delay(500);
        }
      } else {
        console.log(
          `Available lists: ${
            config.lists?.map((l: { Name: string }) => l.Name).join(", ") ||
            "none"
          }`
        );

        for (const list of config.lists || []) {
          const eventLabel = scrapeOptions.eventLabelOverride ?? inferEventFromListName(list.Name);
          console.log(
            `Fetching RRPublish list: ${list.Name} (${list.ID}) → Event "${eventLabel}"...`
          );
          const listData = await fetchListDataRrpublish(
            eventId,
            server,
            apiKey,
            list.Name,
            9999
          );
          if (!listData) {
            console.log(`Skipping list: ${list.Name}`);
            continue;
          }
          const rows = parseListData(listData, eventLabel);
          console.log(`Found ${rows.length} rows from ${list.Name}`);
          allRows.push(...rows);
          await delay(500);
        }
      }

      console.log(`Total rows found: ${allRows.length}`);

      let newRecordsCount = 0;
      for (const row of allRows) {
        const record = convertToRecord(row);
        const k = recordDedupeKey(record);
        if (processedKeys.has(k)) {
          continue;
        }

        const isKom = record.Event.endsWith("(kom)");
        if (isKom) {
          komRecords.push(record);
        } else {
          records.push(record);
        }
        processedKeys.add(k);
        newRecordsCount++;

        console.log(
          `${record.BIB_NO},${record.Gender},${record.Event},${record.Time},${record.Status}`
        );

        fs.writeFileSync(
          isKom ? komOutputFile : outputFile,
          JSON.stringify(isKom ? komRecords : records, null, 2)
        );
      }

      console.log(`Scraping completed! Added ${newRecordsCount} new records.`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Error during scraping (attempt ${attempt + 1}/${maxRetries}):`,
        error
      );

      if (attempt < maxRetries - 1) {
        console.log(`Retrying in 3 seconds...`);
        await delay(3000);
      }
    }
  }

  throw lastError || new Error("Failed to scrape after all retries");
}

async function main() {
  const program = new Command();

  program
    .name("raceresult-crawler")
    .description("Crawl Race Result platform results")
    .argument("<event_id>", "Event ID (e.g., 370186)")
    .argument(
      "[key]",
      "Event key (optional if RACERESULT_KEY or config exposes key)"
    )
    .option(
      "-o, --output <path>",
      "Output file path (default: data/iksan_2025.json)"
    )
    .option(
      "--results-list",
      "Use /{eventId}/results/list (Online|그란폰도 + Online|메디오폰도)"
    )
    .option(
      "--list-host <host>",
      "Override list server host (e.g. my-hk-1.raceresult.com); else config.server or RACERESULT_LIST_HOST"
    )
    .option(
      "--event-label <label>",
      "Override event label for all lists (e.g. 그란폰도). Useful for single-course events."
    );

  program.parse();

  const options = program.opts();
  const [eventId, key] = program.args as [string, string | undefined];

  try {
    await scrapeRaceResult(eventId, key ?? "", options.output, 3, {
      useResultsList: Boolean(options.resultsList),
      listHostOverride: options.listHost,
      eventLabelOverride: options.eventLabel,
    });
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  buildFieldIndices,
  convertToRecord,
  fetchConfig,
  fetchListDataResultsList,
  fetchListDataRrpublish,
  inferEventFromListName,
  parseListData,
  scrapeRaceResult,
};
