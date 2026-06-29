#!/usr/bin/env node

import { getEventInfo, generateUrl } from "./event.utils";
import { EVENTS } from "./event.config";
import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";

type Record = {
  BIB_NO: number;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
  StartTime?: string;
  FinishTime?: string;
};

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr;
}

async function scrapeRecord(
  location: string,
  year: string,
  bibNo: number
): Promise<Record> {
  const eventInfo = getEventInfo(location, year);
  if (!eventInfo) {
    throw new Error(`Invalid location or year: ${location} ${year}`);
  }

  const url = generateUrl(eventInfo, bibNo);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // 데이터가 없는 경우 빈 레코드 반환 (콘솔에 표시하기 위해)
    if (
      response.data.includes("데이터가 없습니다") ||
      response.data.includes("No Results")
    ) {
      return {
        BIB_NO: bibNo,
        Gender: "",
        Event: "",
        Time: "",
        Status: "",
      };
    }

    const playerInfoElement = $("p.name span");
    const playerInfoText = playerInfoElement.text().trim();

    const categoryMatch = playerInfoText.match(/([MF]) (.+)/);

    const gender = categoryMatch ? categoryMatch[1] : "";
    const event = categoryMatch ? categoryMatch[2] : "";

    let time = "";
    let status = "";
    let startTime = "";
    let finishTime = "";

    // 먼저 기록이 있는지 확인
    const timeElement = $("div.record div.time");
    if (timeElement.length > 0) {
      const recordTime = timeElement.text().trim();
      if (recordTime && recordTime !== "") {
        time = formatTime(recordTime);
      }
    }

    // Start Time, Finish Time 파싱
    $("div.record p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.startsWith("Start Time")) {
        // "Start Time : 07:23:17.79" 형식에서 시간만 추출
        const match = text.match(/Start Time\s*:?\s*([0-9:.]+)/);
        if (match) startTime = match[1];
      } else if (text.startsWith("Finish Time")) {
        const match = text.match(/Finish Time\s*:?\s*([0-9:.]+)/);
        if (match) finishTime = match[1];
      }
    });

    // 기록이 없는 경우 Start Time을 확인하여 DNS/DNF 구분
    if (!time) {
      const startTimeText = $("div.record p")
        .filter((_, el) => $(el).text().includes("Start Time"))
        .text()
        .trim();

      // Start Time이 있는지 확인 (실제 시간 값이 있는지 체크)
      const hasStartTime =
        startTimeText.includes(":") && startTimeText.split(":").length > 1;

      if (hasStartTime) {
        // Start Time은 있지만 기록이 없으면 DNF
        status = "DNF";
      } else {
        // Start Time도 없으면 DNS
        status = "DNS";
      }
    }

    return {
      BIB_NO: bibNo,
      Gender: gender,
      Event: event,
      Time: time,
      Status: status,
      StartTime: startTime,
      FinishTime: finishTime,
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

async function scrapeYear(
  location: string,
  year: string,
  startBib: number = 1,
  endBib: number = 9999,
  period: number = 150
): Promise<void> {
  const eventInfo = getEventInfo(location, year);
  if (!eventInfo) {
    console.error(`Invalid location or year: ${location} ${year}`);
    return;
  }

  const outputFile = path.join(__dirname, `${location}_${year}.json`);
  const records: Record[] = [];

  console.log(
    `Starting to scrape ${location} Granfondo ${year} from bib #${startBib} to #${endBib}`
  );
  console.log(`Results will be saved to: ${outputFile}`);
  console.log(
    `API call period: ${period}ms (${1000 / period} calls per second)`
  );

  // Create initial empty file
  fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));

  for (let bibNo = startBib; bibNo <= endBib; bibNo++) {
    const apiStart = Date.now();
    const record = await scrapeRecord(location, year, bibNo);

    // 항상 콘솔에 표시
    console.log(
      `${record.BIB_NO},${record.Gender},${record.Event},${record.Time},${record.Status}`
    );

    // 파일에는 조건을 만족하는 레코드만 저장
    if (record.Time || record.Status) {
      records.push(record);
      // Save to file after each record
      fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
    }

    const fetchAndWriteFileDuration = Date.now() - apiStart;
    const delayMs = Math.max(0, period - fetchAndWriteFileDuration);
    await delay(delayMs);
  }

  console.log(`Scraping completed for ${location} ${year}!`);
}

async function main() {
  const program = new Command();

  program
    .name("sptc-json-crawler")
    .description("Crawl SPTC Granfondo results")
    .argument("<location>", "Location of the event (e.g., 영산강, 홍천)")
    .argument("[year]", "Year of the event (e.g., 2024)")
    .argument("[startBib]", "Starting bib number", (val) => parseInt(val, 10))
    .argument("[endBib]", "Ending bib number", (val) => parseInt(val, 10))
    .option(
      "-p, --period <number>",
      "API call period in milliseconds (default: 150)",
      (val) => parseInt(val, 10),
      150
    );

  program.parse();

  const options = program.opts();
  const [location, year, startBib = 1, endBib = 9999] = program.args as [
    string,
    string | undefined,
    number,
    number
  ];

  if (!EVENTS[location]) {
    console.error(`Invalid location: ${location}`);
    process.exit(1);
  }

  if (year) {
    // If year is specified, scrape only that year
    await scrapeYear(location, year, startBib, endBib, options.period);
  } else {
    // If no year is specified, scrape all available years
    const years = Object.keys(EVENTS[location]);
    for (const year of years) {
      await scrapeYear(location, year, startBib, endBib, options.period);
    }
  }
}

main().catch(console.error);
