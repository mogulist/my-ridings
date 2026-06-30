#!/usr/bin/env node

import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";

const RACERESULT_BASE = "https://raceresult.co.kr";
const NUMERIC_BIB_MAX = 9999;

type Record = {
  BIB_NO: string;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
  StartTime?: string;
  FinishTime?: string;
  Competition?: string;
  Name?: string;
  Pace?: string;
  Speed?: string;
  A_rank?: string;
  G_rank?: string;
  O_rank?: string;
  Sa?: string;
  KOM_NAME?: string;
  KOM_TIME?: string;
  DOWN_SPEED_NAME?: string;
  DOWN_SPEED_TIME?: string;
  CP_01_TOD?: string;
  CP_01_TIME?: string;
  CP_01_NAME?: string;
  CP_02_TOD?: string;
  CP_02_TIME?: string;
  CP_02_NAME?: string;
  CP_03_TOD?: string;
  CP_03_TIME?: string;
  CP_03_NAME?: string;
  CP_04_TOD?: string;
  CP_04_TIME?: string;
  CP_04_NAME?: string;
  CP_05_TOD?: string;
  CP_05_TIME?: string;
  CP_05_NAME?: string;
};

type MarazoneRecord = {
  Competition: string;
  Bib: string;
  Name: string;
  Division: string;
  Time: string;
  Sex: string;
  Net_start: string;
  Net_finish: string;
  Pace: string;
  Speed: string;
  A_rank: string;
  G_rank: string;
  O_rank: string;
  Sa: string;
  KOM_NAME: string;
  KOM_TIME: string;
  DOWN_SPEED_NAME: string;
  DOWN_SPEED_TIME: string;
  CP_01_TOD: string;
  CP_01_TIME: string;
  CP_01_NAME: string;
  CP_02_TOD: string;
  CP_02_TIME: string;
  CP_02_NAME: string;
  CP_03_TOD: string;
  CP_03_TIME: string;
  CP_03_NAME: string;
  CP_04_TOD: string;
  CP_04_TIME: string;
  CP_04_NAME: string;
  CP_05_TOD: string;
  CP_05_TIME: string;
  CP_05_NAME: string;
};

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeRecord(
  location: string,
  year: string,
  bibNo: string
): Promise<Record> {
  const url = `${RACERESULT_BASE}/api/record-info`;
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Type": "application/json",
    Origin: RACERESULT_BASE,
    Pragma: "no-cache",
    Referer: `${RACERESULT_BASE}/record`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  };

  try {
    const response = await axios.post(
      url,
      {
        comp_title: location,
        bibNum: bibNo,
        name: "",
      },
      { headers }
    );

    const data = response.data as MarazoneRecord[];

    if (!data || data.length === 0) {
      return {
        BIB_NO: bibNo,
        Gender: "",
        Event: "",
        Time: "",
        Status: "",
      };
    }

    const record = data[0];
    const hasStartTime = record.Net_start && record.Net_start !== "-";
    const hasFinishTime = record.Net_finish && record.Net_finish !== "-";
    const hasTime = record.Time && record.Time !== "-";

    let status = "";
    if (!hasTime && !hasFinishTime) {
      status = hasStartTime ? "DNF" : "DNS";
    } else if (!hasTime && !hasStartTime && hasFinishTime) {
      status = "INVALID";
    }

    return {
      BIB_NO: record.Bib,
      Gender: record.Sex,
      Event: record.Division,
      Time: record.Time,
      Status: status,
      StartTime: record.Net_start,
      FinishTime: record.Net_finish,
      Competition: record.Competition,
      Name: record.Name,
      Pace: record.Pace,
      Speed: record.Speed,
      A_rank: record.A_rank,
      G_rank: record.G_rank,
      O_rank: record.O_rank,
      Sa: record.Sa,
      KOM_NAME: record.KOM_NAME,
      KOM_TIME: record.KOM_TIME,
      DOWN_SPEED_NAME: record.DOWN_SPEED_NAME,
      DOWN_SPEED_TIME: record.DOWN_SPEED_TIME,
      CP_01_TOD: record.CP_01_TOD,
      CP_01_TIME: record.CP_01_TIME,
      CP_01_NAME: record.CP_01_NAME,
      CP_02_TOD: record.CP_02_TOD,
      CP_02_TIME: record.CP_02_TIME,
      CP_02_NAME: record.CP_02_NAME,
      CP_03_TOD: record.CP_03_TOD,
      CP_03_TIME: record.CP_03_TIME,
      CP_03_NAME: record.CP_03_NAME,
      CP_04_TOD: record.CP_04_TOD,
      CP_04_TIME: record.CP_04_TIME,
      CP_04_NAME: record.CP_04_NAME,
      CP_05_TOD: record.CP_05_TOD,
      CP_05_TIME: record.CP_05_TIME,
      CP_05_NAME: record.CP_05_NAME,
    };
  } catch (error) {
    console.error(`Error processing BIB #${bibNo}:`, error);
    return {
      BIB_NO: bibNo,
      Gender: "",
      Event: "",
      Time: "",
      Status: "",
    };
  }
}

function resolveOutputFile(
  location: string,
  year: string,
  outputPath?: string
): string {
  if (outputPath) {
    return path.isAbsolute(outputPath)
      ? outputPath
      : path.join(process.cwd(), outputPath);
  }

  return path.join(__dirname, `${location}_${year}.json`);
}

function getDigitsPadding(
  letter: string,
  startLetter: string,
  endLetter: string,
  startDigits: number,
  endDigits: number,
  maxDigits: number
): number {
  if (startLetter === endLetter) {
    return Math.max(startDigits, endDigits);
  }

  if (letter === startLetter) {
    return startDigits;
  }

  if (letter === endLetter) {
    return endDigits;
  }

  return maxDigits;
}

function getMaxNumber(digits: number): number {
  if (digits <= 0) {
    return 0;
  }

  return parseInt("9".repeat(digits), 10);
}

function isNumericBibRange(startBib: string, endBib: string): boolean {
  return /^\d+$/.test(startBib) && /^\d+$/.test(endBib);
}

async function scrapeYear(
  location: string,
  year: string,
  startBib: string = "A000",
  endBib: string = "Z999",
  period: number = 200, // 1초에 5번 호출 = 200ms 간격
  outputPath?: string
): Promise<void> {
  const outputFile = resolveOutputFile(location, year, outputPath);
  let records: Record[] = [];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  if (fs.existsSync(outputFile)) {
    try {
      const content = fs.readFileSync(outputFile, "utf-8");
      if (content) {
        records = JSON.parse(content) as Record[];
      }
    } catch (error) {
      console.warn(
        `Failed to load existing records from ${outputFile}. Starting fresh.`,
        error
      );
      records = [];
    }
  } else {
    fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
  }

  const processedBibs = new Set(records.map((record) => record.BIB_NO));

  console.log(
    `Starting to scrape ${location} Granfondo ${year} from bib #${startBib} to #${endBib}`
  );
  console.log(`Results will be saved to: ${outputFile}`);
  console.log(
    `Already processed records: ${processedBibs.size} (will be skipped)`
  );
  console.log(
    `API call period: ${period}ms (${1000 / period} calls per second)`
  );

  const processBib = async (bibNo: string, detail?: string) => {
    const suffix = detail ? ` (${detail})` : "";
    console.log(`Processing bib ${bibNo} for ${location} ${year}${suffix}`);

    if (processedBibs.has(bibNo)) {
      return;
    }

    const apiStart = Date.now();
    const record = await scrapeRecord(location, year, bibNo);

    console.log(
      `${record.BIB_NO},${record.Gender},${record.Event},${record.Time},${record.Status}`
    );

    if (record.Time || record.Status) {
      records.push(record);
      processedBibs.add(bibNo);
      fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
    }

    const fetchAndWriteFileDuration = Date.now() - apiStart;
    const delayMs = Math.max(0, period - fetchAndWriteFileDuration);
    await delay(delayMs);
  };

  if (isNumericBibRange(startBib, endBib)) {
    let n0 = parseInt(startBib, 10);
    let n1 = parseInt(endBib, 10);
    if (n0 > n1) {
      [n0, n1] = [n1, n0];
    }
    n0 = Math.max(0, Math.min(NUMERIC_BIB_MAX, n0));
    n1 = Math.max(0, Math.min(NUMERIC_BIB_MAX, n1));

    console.log(`Numeric bib range: ${n0}–${n1} (max ${NUMERIC_BIB_MAX})`);

    for (let bibNum = n0; bibNum <= n1; bibNum++) {
      await processBib(String(bibNum));
    }

    console.log(`Scraping completed for ${location} ${year}!`);
    return;
  }

  const startLetter = startBib.charAt(0);
  const endLetter = endBib.charAt(0);
  const startNumberString = startBib.substring(1);
  const endNumberString = endBib.substring(1);
  const startNum = parseInt(startNumberString, 10);
  const endNum = parseInt(endNumberString, 10);
  const startDigits = startNumberString.length;
  const endDigits = endNumberString.length;
  const maxDigits = Math.max(startDigits, endDigits, 3);

  for (
    let letterCode = startLetter.charCodeAt(0);
    letterCode <= endLetter.charCodeAt(0);
    letterCode++
  ) {
    const letter = String.fromCharCode(letterCode);
    const isStartLetter = letter === startLetter;
    const isEndLetter = letter === endLetter;
    const padding = getDigitsPadding(
      letter,
      startLetter,
      endLetter,
      startDigits,
      endDigits,
      maxDigits
    );
    const numStart = isStartLetter ? startNum : 0;
    const numEnd = isEndLetter ? endNum : getMaxNumber(padding);

    for (let bibNum = numStart; bibNum <= numEnd; bibNum++) {
      const bibNo = `${letter}${bibNum.toString().padStart(padding, "0")}`;
      await processBib(bibNo, `padding: ${padding}`);
    }
  }

  console.log(`Scraping completed for ${location} ${year}!`);
}

async function main() {
  const program = new Command();

  program
    .name("marazone-crawler")
    .description("Crawl Marazone Granfondo results")
    .argument("<location>", "Location of the event (e.g., 트렉가평자라섬)")
    .argument("[year]", "Year of the event (e.g., 2024)")
    .argument(
      "[startBib]",
      "Start bib: letter+digits (e.g. A500) or numeric only 0–9999 (e.g. 2100)"
    )
    .argument(
      "[endBib]",
      "End bib: letter+digits or numeric only (both args must use the same style)"
    )
    .option(
      "-p, --period <number>",
      "API call period in milliseconds (default: 200)",
      (val) => parseInt(val, 10),
      200
    )
    .option(
      "-o, --output <path>",
      "Output file path (default: crawlers directory with <location>_<year>.json)"
    );

  program.parse();

  const options = program.opts();
  const [location, year, startBib = "A000", endBib = "Z999"] = program.args as [
    string,
    string | undefined,
    string,
    string
  ];

  if (year) {
    // If year is specified, scrape only that year
    await scrapeYear(
      location,
      year,
      startBib,
      endBib,
      options.period,
      options.output
    );
  } else {
    // If no year is specified, scrape current year
    const currentYear = new Date().getFullYear().toString();
    await scrapeYear(
      location,
      currentYear,
      startBib,
      endBib,
      options.period,
      options.output
    );
  }
}

const isDirectExecution =
  (typeof import.meta !== "undefined" &&
    (import.meta as { main?: boolean }).main === true) ||
  (typeof module !== "undefined" &&
    typeof require !== "undefined" &&
    require.main === module);

if (isDirectExecution) {
  main().catch(console.error);
}
