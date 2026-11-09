import type { Event } from "./types";
import { hasOnlyKomRecords } from "./record-scope";
import { getYearStatsWithCourses } from "./stats";
import { getEventParticipantTrend } from "./participants";
import { getFindByRecordData } from "./find-by-record-data";
import { getEventById } from "./db/events";

jest.mock("./db/events", () => ({ getEventById: jest.fn() }));

const event: Event = {
  id: "buyeo", name: "부여", location: "부여", years: [2026], status: "completed",
  color: { from: "", to: "" }, meta: { title: "", description: "", image: "" },
  yearDetails: { 2026: {
    year: 2026, date: "2026.10.31", totalRegistered: 0,
    komRecordsBlobUrl: "https://example.com/kom-records.json",
    komSortedRecordsBlobUrl: "https://example.com/kom-sorted.json",
    courses: [{ id: "granfondo", name: "그란폰도", distance: 105.28, hasKom: true }],
  } },
};
const records = [
  { BIB_NO: "1", Event: "그란폰도(kom)", Gender: "남", Time: "00:05:00", Status: "FINISH" },
  { BIB_NO: "2", Event: "그란폰도(kom)", Gender: "여", Time: "00:06:00", Status: "FINISH" },
];
const sorted = { "그란폰도(kom)": [300000, 360000], "그란폰도(kom)_M": [300000], "그란폰도(kom)_F": [360000] };

beforeEach(() => {
  jest.mocked(getEventById).mockResolvedValue(event);
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => String(url).includes("sorted") ? sorted : records })) as jest.Mock;
});
afterEach(() => jest.restoreAllMocks());

test("일반 기록 없이 KOM만 공개된 연도도 코스별 차트 영역이 만들어진다", async () => {
  const stats = await getYearStatsWithCourses(event, "/tmp/no-records");

  expect(stats).toHaveLength(1);
  expect(stats[0].distributions[0].courseId).toBe("granfondo");
  expect(fetch).not.toHaveBeenCalled();
});

test("KOM 기록만으로 전체 참가자 수나 완주율을 만들지 않는다", async () => {
  const trends = await getEventParticipantTrend(event);

  expect(trends).toEqual([]);
});

test("KOM 기록 찾기는 통합 순위와 남녀 기록 수를 계산한다", async () => {
  const result = await getFindByRecordData("buyeo", "granfondo", "2026", "000600", "kom");

  expect(result).toMatchObject({ rank: 2, finishers: 2, finishersMale: 1, finishersFemale: 1 });
});

test("KOM만 있는 코스의 전체 시간 검색을 KOM 순위로 해석하지 않는다", async () => {
  expect(await getFindByRecordData("buyeo", "granfondo", "2026", "040000", "full")).toBeNull();
});

test("일반 기록과 KOM이 함께 있는 기존 대회는 KOM 전용으로 판단하지 않는다", () => {
  expect(hasOnlyKomRecords({ ...event.yearDetails[2026], recordsBlobUrl: "https://example.com/full.json" })).toBe(false);
  expect(hasOnlyKomRecords(event.yearDetails[2026])).toBe(true);
});
