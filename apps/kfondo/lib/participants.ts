import fs from "fs";
import path from "path";
import type { Event } from "./types";
import { tryFetchParticipantRecordsFromBlob } from "./participant-records-blob";

type Participant = {
  BIB_NO: number;
  Gender: string;
  Event: string;
  Time: string;
  Status: string;
};

async function fetchParticipants(event: Event, year: number): Promise<Participant[]> {
  const blobUrl = event.yearDetails[year]?.recordsBlobUrl;

  if (blobUrl) {
    const fromBlob = await tryFetchParticipantRecordsFromBlob(
      blobUrl,
      event.id,
      year
    );
    if (fromBlob !== null) return fromBlob;
  }

  // 로컬 파일 폴백
  if (typeof window === "undefined") {
    try {
      const filePath = path.join(process.cwd(), "data", `${event.id}_${year}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(fileContent);
      }
    } catch {
      // ignore
    }
  }

  return [];
}

// 개별 연도의 참가자 수 계산 (Async)
export async function calculateParticipants(
  event: Event,
  year: number
): Promise<Record<string, number>> {
  const { courses } = event.yearDetails[year];
  const courseIdsNames = courses.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const participants = await fetchParticipants(event, year);

  return courseIdsNames.reduce((acc: Record<string, number>, curr) => {
    const count = participants.filter(
      (participant) =>
        (participant.Event === curr.id || participant.Event === curr.name) &&
        participant.Status !== "DNS" &&
        participant.Status !== "INVALID"
    ).length;
    acc[curr.id] = count;
    return acc;
  }, {});
}

// 개별 연도의 DNF 계산 (Async)
export async function calculateDNF(
  event: Event,
  year: number
): Promise<Record<string, number>> {
  const { courses } = event.yearDetails[year];
  const courseIdsNames = courses.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const participants = await fetchParticipants(event, year);

  return courseIdsNames.reduce((acc: Record<string, number>, curr) => {
    const count = participants.filter(
      (participant) =>
        (participant.Event === curr.id || participant.Event === curr.name) &&
        participant.Status === "DNF"
    ).length;
    acc[curr.id] = count;
    return acc;
  }, {});
}

type BaseCourse = {
  id: string;
  name: string;
};

// 특정 코스 참가자 수 (Async)
// participants 데이터를 인자로 받아서 중복 fetch 방지
function calculateParticipantsForData(
  participants: Participant[],
  event: Event,
  course: BaseCourse,
  year: number
): number {
  const yearDetail = event.yearDetails[year];
  const courseForYear = yearDetail?.courses.find((c) => c.id === course.id);
  const courseNameForYear = courseForYear?.name ?? course.name;
  let participantsCount = 0;

  participants.forEach((participant) => {
    if (
      (participant.Event === course.id ||
        participant.Event === courseNameForYear ||
        participant.Event === course.name) &&
      participant.Status !== "DNS" &&
      participant.Status !== "INVALID"
    ) {
      participantsCount++;
    }
  });

  return participantsCount;
}

// 특정 코스 DNF 수 (Async - participants 받음)
function calculateDNFsForData(
  participants: Participant[],
  event: Event,
  course: BaseCourse,
  year: number
): number {
  const yearDetail = event.yearDetails[year];
  const courseForYear = yearDetail?.courses.find((c) => c.id === course.id);
  const courseNameForYear = courseForYear?.name ?? course.name;
  let dnfCount = 0;

  participants.forEach((participant) => {
    if (
      (participant.Event === course.id ||
        participant.Event === courseNameForYear ||
        participant.Event === course.name) &&
      participant.Status === "DNF"
    ) {
      dnfCount++;
    }
  });

  return dnfCount;
}

type EventParticipantTrendForYear = {
  year: number;
  registered: number;
  participants: number;
  dnf: number;
  participationRate: string;
  completionRate: string;
};
type EventParticipantTrendForACourse = {
  id: string;
  name: string;
  yearlyData: EventParticipantTrendForYear[];
};

export type EventParticipantTrends = EventParticipantTrendForACourse[];

// 메인 함수 (Async)
export const getEventParticipantTrend = async (
  event: Event
): Promise<EventParticipantTrends> => {
  // 모든 연도의 코스 id 합집합으로 시리즈 기준을 만든다
  const idToName: Record<string, string> = {};
  event.years.forEach((y) => {
    const yd = event.yearDetails[y];
    yd.courses.forEach((c) => {
      if (c.id === "granfondo") idToName[c.id] = "그란폰도";
      else if (c.id === "mediofondo") idToName[c.id] = "메디오폰도";
      else if (!(c.id in idToName)) idToName[c.id] = c.name;
    });
  });
  const baseCourses = Object.entries(idToName).map(([id, name]) => ({
    id,
    name,
  }));

  const recentlyFirstSortedYears = event.years.sort((a, b) => b - a);

  // 각 연도별 데이터를 미리 fetch (병렬 처리)
  const participantsByYear = new Map<number, Participant[]>();
  await Promise.all(
    recentlyFirstSortedYears.map(async (year) => {
      if (event.yearDetails[year].status !== "preparing") {
         const data = await fetchParticipants(event, year);
         participantsByYear.set(year, data);
      }
    })
  );

  const eventParticipantTrends: EventParticipantTrends = baseCourses.map(
    (course) => {
      const yearlyData: EventParticipantTrendForYear[] = [];

      recentlyFirstSortedYears.forEach((year) => {
        const yearDetail = event.yearDetails[year];

        if (yearDetail.status === "preparing") {
          return;
        }

        const courseData = yearDetail.courses.find((c) => c.id === course.id);
        const registered = courseData?.registered ?? 0;
        
        const participants = participantsByYear.get(year) || [];
        const participantsCount = calculateParticipantsForData(participants, event, course, year);
        const dnfCount = calculateDNFsForData(participants, event, course, year);
        
        const participationRate =
          registered === 0
            ? "0"
            : ((100 * participantsCount) / registered).toFixed(1);
        const completionRate = dnfCount
          ? ((100 * (participantsCount - dnfCount)) / participantsCount).toFixed(1)
          : "100";

        yearlyData.push({
          year,
          registered: registered,
          participants: participantsCount,
          dnf: dnfCount,
          participationRate,
          completionRate,
        });
      });

      return {
        id: course.id,
        name: course.name,
        yearlyData,
      };
    }
  );

  return eventParticipantTrends;
};
