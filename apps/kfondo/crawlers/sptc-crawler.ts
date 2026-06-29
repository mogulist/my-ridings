import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { getEventInfo, generateUrl } from "./event.utils";

export interface Record {
  bibNo: number;
  gender: string;
  event: string;
  time: string;
  status: string;
  shouldSave: boolean;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.split(".")[0];
}

export async function scrapeRecord(
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

    if (
      response.data.includes("데이터가 없습니다") ||
      response.data.includes("No Results")
    ) {
      return {
        bibNo,
        gender: "",
        event: "",
        time: "",
        status: "",
        shouldSave: false,
      };
    }

    const playerInfoElement = $("p.name span");
    const playerInfoText = playerInfoElement.text().trim();

    const categoryMatch = playerInfoText.match(/([MF]) (.+)/);

    const gender = categoryMatch ? categoryMatch[1] : "";
    const event = categoryMatch ? categoryMatch[2] : "";

    let time = "";
    let status = "";

    // 먼저 기록이 있는지 확인
    const timeElement = $("div.record div.time");
    if (timeElement.length > 0) {
      const recordTime = timeElement.text().trim();
      if (recordTime && recordTime !== "") {
        time = formatTime(recordTime);
      }
    }

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
      bibNo,
      gender,
      event,
      time,
      status,
      shouldSave: true,
    };
  } catch (error) {
    console.error(`Error processing BIB #${bibNo}:`, error);
    return {
      bibNo,
      gender: "",
      event: "",
      time: "",
      status: "",
      shouldSave: false,
    };
  }
}

async function main() {
  const [location, year, startBibStr, endBibStr] = process.argv.slice(2);

  if (!location || !year || !startBibStr || !endBibStr) {
    console.error(
      "Usage: bun run sptc-crawler.ts <location> <year> <start_bib> <end_bib>"
    );
    console.error("Example: bun run sptc-crawler.ts 홍천 2025 1 9999");
    process.exit(1);
  }

  const startBib = parseInt(startBibStr);
  const endBib = parseInt(endBibStr);

  const eventInfo = getEventInfo(location, year);
  if (!eventInfo) {
    console.error(`Invalid location or year: ${location} ${year}`);
    process.exit(1);
  }

  const outputFile = path.join(__dirname, `results_${location}_${year}.csv`);
  fs.writeFileSync(outputFile, "BIB_NO,Gender,Event,Time,Status\n");

  for (let bibNo = startBib; bibNo <= endBib; bibNo++) {
    const record = await scrapeRecord(location, year, bibNo);

    console.log(
      `${record.bibNo},${record.gender},${record.event},${record.time},${record.status}`
    );

    if (record.shouldSave) {
      const csvLine = `${record.bibNo},${record.gender},${record.event},${record.time},${record.status}\n`;
      fs.appendFileSync(outputFile, csvLine);
    }

    await delay(250); // 0.25초 대기 (1초에 4번 호출)
  }

  console.log("Scraping completed!");
}

main().catch(console.error);
