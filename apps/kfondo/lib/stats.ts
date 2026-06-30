import path from "path";
import fs from "fs";
import type {
  Event,
  EventYearStats,
  EventYearStatsWithCourses,
  RaceRecord,
} from "./types";
import { generateTimeDistributionFromRecords } from "./record-stats";
import { parseJsonRecordsToRaceRecords } from "./race-records-parse";

// 레코드 가져오기 (Blob URL 우선, 로컬 파일 폴백)
async function fetchRecords(
  event: Event,
  year: number,
  dataDir: string
): Promise<RaceRecord[]> {
  const blobUrl = event.yearDetails[year]?.recordsBlobUrl;

  // 1. Blob URL 사용
  if (blobUrl) {
    try {
      const response = await fetch(blobUrl, {
        next: { revalidate: 3600, tags: [`event-${event.id}`] },
      });
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
      const rawRecords = await response.json();
      return parseJsonRecordsToRaceRecords(rawRecords);
    } catch (error) {
      console.warn(
        `[Stats] Blob fetch failed for ${event.id} ${year}, falling back to local file.`,
        error
      );
    }
  }

  // 2. 로컬 파일 폴백 (Node SSR 또는 jest jsdom 등에서 로컬 JSON 사용)
  const canUseFilesystem =
    typeof window === "undefined" || Boolean(process.env.JEST_WORKER_ID);
  if (canUseFilesystem) {
    const filePath = path.join(dataDir, `${event.id}_${year}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return parseJsonRecordsToRaceRecords(JSON.parse(raw));
    }
  }

  return [];
}

export async function getYearStats(
  event: Event,
  dataDir: string
): Promise<EventYearStats[]> {
  const statsPromises = event.years.map(async (year) => {
    const records = await fetchRecords(event, year, dataDir);
    
    if (records.length === 0) return null;

    const gran = event.yearDetails[year]?.courses.find(
      (c) => c.id === "granfondo"
    );
    const granfondoComment = gran?.comment;

    return {
      year,
      granFondoDistribution: generateTimeDistributionFromRecords(
        records,
        "그란폰도",
        2,
        year
      ),
      medioFondoDistribution: generateTimeDistributionFromRecords(
        records,
        "메디오폰도",
        2,
        year
      ),
      comment: granfondoComment,
    };
  });

  const results = await Promise.all(statsPromises);
  const yearStats: EventYearStats[] = [];
  
  for (const s of results) {
    if (s) yearStats.push(s);
  }

  yearStats.sort((a, b) => b.year - a.year);
  return yearStats;
}

export async function getYearStatsWithCourses(
  event: Event,
  dataDir: string
): Promise<EventYearStatsWithCourses[]> {
  const statsPromises = event.years.map(async (year) => {
    const records = await fetchRecords(event, year, dataDir);

    if (records.length === 0) return null;

    const detail = event.yearDetails[year];
    const distributions = detail.courses.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      distribution: generateTimeDistributionFromRecords(
        records,
        course.name,
        2,
        year
      ),
    }));

    // comment는 granfondo에만 있다고 가정
    const gran = detail.courses.find((c) => c.id === "granfondo");
    const granfondoComment = gran?.comment;

    return {
      year,
      distributions,
      comment: granfondoComment,
    };
  });

  const results = await Promise.all(statsPromises);
  const yearStats: EventYearStatsWithCourses[] = [];

  for (const s of results) {
    if (s) yearStats.push(s);
  }

  yearStats.sort((a, b) => b.year - a.year);
  return yearStats;
}
