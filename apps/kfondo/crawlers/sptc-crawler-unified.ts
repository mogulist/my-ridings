import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import { CrawlerRecord } from "./types";

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr;
}

function generateUrl(eventNo: string, bibNo: number): string {
  const bibStr = bibNo.toString().padStart(6, "0");
  // 2025년은 https를 사용
  const year = parseInt(eventNo.slice(0, 4), 10);
  const protocol = year >= 2025 ? "https" : "http";

  // 모든 이벤트에 대해 새로운 URL 형식 사용 (E와 B 파라미터)
  return `${protocol}://time.spct.kr/m2.php?E=${eventNo}&B=${bibStr}`;
}

async function scrapeRecord(
  eventNo: string,
  bibNo: number
): Promise<CrawlerRecord> {
  const url = generateUrl(eventNo, bibNo);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // 데이터가 없는 경우 빈 레코드 반환
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

      const hasStartTime =
        startTimeText.includes(":") && startTimeText.split(":").length > 1;

      if (hasStartTime) {
        status = "DNF";
      } else {
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

export async function crawlSptc(
  eventName: string,
  eventNo: string,
  startBib: number = 1,
  endBib: number = 9999,
  period: number = 150,
  outputFile?: string
): Promise<CrawlerRecord[]> {
  const records: CrawlerRecord[] = [];

  console.log(
    `Starting to scrape ${eventName} (Event No: ${eventNo}) from bib #${startBib} to #${endBib}`
  );
  if (outputFile) {
    console.log(`Results will be saved to: ${outputFile}`);
  }
  console.log(
    `API call period: ${period}ms (${1000 / period} calls per second)`
  );

  for (let bibNo = startBib; bibNo <= endBib; bibNo++) {
    const apiStart = Date.now();
    const record = await scrapeRecord(eventNo, bibNo);

    // 항상 콘솔에 표시
    console.log(
      `${record.BIB_NO},${record.Gender},${record.Event},${record.Time},${record.Status}`
    );

    // 파일에는 조건을 만족하는 레코드만 저장
    if (record.Time || record.Status) {
      records.push(record);
      // Save to file after each record if outputFile is provided
      if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
      }
    }

    const fetchAndWriteFileDuration = Date.now() - apiStart;
    const delayMs = Math.max(0, period - fetchAndWriteFileDuration);
    await delay(delayMs);
  }

  console.log(`Scraping completed for ${eventName}!`);
  return records;
}
