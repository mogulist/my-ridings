#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { crawlSmartChip } from "./smartchip-crawler-unified";
import { crawlSptc } from "./sptc-crawler-unified";
import {
  CrawlerRecord,
  CrawlerType,
  CrawlerConfig,
  CrawlerFunction,
} from "./types";

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveRecordToFile(records: CrawlerRecord[], outputFile: string): void {
  fs.writeFileSync(outputFile, JSON.stringify(records, null, 2));
}

function createOutputFile(eventName: string): string {
  const outputDir = path.join(__dirname, "../data/preliminary");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputFile = path.join(outputDir, `${eventName}.json`);

  // Create initial empty file
  fs.writeFileSync(outputFile, JSON.stringify([], null, 2));

  return outputFile;
}

// 크롤러 함수들을 통일된 인터페이스로 래핑
async function crawlSptcWrapper(
  config: CrawlerConfig
): Promise<CrawlerRecord[]> {
  return await crawlSptc(
    config.eventName,
    config.eventId,
    config.startBib,
    config.endBib,
    config.period,
    config.outputFile
  );
}

async function crawlSmartChipWrapper(
  config: CrawlerConfig
): Promise<CrawlerRecord[]> {
  return await crawlSmartChip(
    config.eventName,
    config.eventId,
    config.startBib,
    config.endBib,
    config.period,
    config.outputFile
  );
}

// 팩토리 함수
function createCrawler(crawlerType: CrawlerType): CrawlerFunction {
  const crawlers: Record<CrawlerType, CrawlerFunction> = {
    sptc: crawlSptcWrapper,
    smartchip: crawlSmartChipWrapper,
  };

  if (!crawlers[crawlerType]) {
    throw new Error(`Unsupported crawler type: ${crawlerType}`);
  }

  return crawlers[crawlerType];
}

function getSupportedCrawlerTypes(): CrawlerType[] {
  return ["sptc", "smartchip"];
}

async function main() {
  const program = new Command();

  program
    .name("unified-crawler")
    .description("Unified crawler for SPTC and SmartChip events")
    .argument("<crawler-name>", "Crawler type: sptc or smartchip")
    .argument(
      "<event-name>",
      "Event name for output filename (e.g., 설악그란폰도)"
    )
    .argument(
      "<event-id>",
      "Event identifier (e.g., 2025090602 for sptc, or usedata for smartchip)"
    )
    .argument(
      "[starting-bib-no]",
      "Starting bib number",
      (val) => parseInt(val, 10),
      1
    )
    .argument(
      "[ending-bib-no]",
      "Ending bib number",
      (val) => parseInt(val, 10),
      9999
    )
    .option(
      "-p, --period <number>",
      "API call period in milliseconds (default: 150)",
      (val) => parseInt(val, 10),
      150
    );

  program.parse();

  const options = program.opts();
  const [crawlerName, eventName, eventId, startBib, endBib] = program.args as [
    string,
    string,
    string,
    number,
    number
  ];

  // 입력 검증
  if (!crawlerName || !eventName || !eventId) {
    console.error("Error: crawler-name, event-name, and event-id are required");
    process.exit(1);
  }

  const supportedTypes = getSupportedCrawlerTypes();
  if (!supportedTypes.includes(crawlerName as CrawlerType)) {
    console.error(
      `Error: Only ${supportedTypes.join(
        " and "
      )} crawlers are currently supported. Got: ${crawlerName}`
    );
    process.exit(1);
  }

  if (startBib < 1 || endBib < startBib) {
    console.error("Error: Invalid bib number range");
    process.exit(1);
  }

  try {
    console.log(`Starting ${crawlerName} crawler for event: ${eventName}`);
    console.log(`Event ID: ${eventId}`);
    console.log(`Bib range: ${startBib} - ${endBib}`);
    console.log(`Period: ${options.period}ms`);

    const outputFile = createOutputFile(eventName);

    // 팩토리 패턴으로 크롤러 생성 및 실행
    const crawler = createCrawler(crawlerName as CrawlerType);
    const config: CrawlerConfig = {
      eventName,
      eventId,
      startBib,
      endBib,
      period: options.period,
      outputFile,
    };

    const records = await crawler(config);
    console.log(`Total records: ${records.length}`);
    console.log(`Output file: ${outputFile}`);

    console.log(`\nCrawling completed successfully!`);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
