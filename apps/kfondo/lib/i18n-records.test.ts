import { localizeEvent } from "@/i18n/content";
import type { Event } from "@/lib/types";
import { calculateParticipants, calculateDNF } from "./participants";
import { getFindByRecordData } from "./find-by-record-data";
import { getYearStatsWithCourses } from "./stats";
import { getEventById } from "./db/events";
import records from "@/tests/fixtures/stats-record-files/hongcheon_2025.json";
jest.mock("./db/events", () => ({ getEventById: jest.fn() }));
const event: Event = {
  id: "hongcheon",
  name: "홍천 그란폰도",
  nameEn: "Hongcheon Gran Fondo",
  location: "홍천",
  years: [2025],
  status: "completed",
  color: { from: "", to: "" },
  meta: { title: "", description: "", image: "" },
  yearDetails: {
    2025: {
      year: 2025,
      date: "2025.04.20",
      totalRegistered: 5,
      recordsBlobUrl: "https://example.com/records.json",
      sortedRecordsBlobUrl: "https://example.com/sorted.json",
      courses: [
        { id: "granfondo", name: "그란폰도", nameEn: "Gran Fondo", distance: 120, registered: 5 },
      ],
    },
  },
};
beforeEach(() => {
  jest
    .mocked(getEventById)
    .mockImplementation(async (_id, locale = "ko") => localizeEvent(event, locale));
  global.fetch = jest.fn(async (input) => ({
    ok: true,
    json: async () =>
      String(input).includes("sorted")
        ? {
            그란폰도: [12600000, 17100000, 19800000],
            그란폰도_M: [12600000, 19800000],
            그란폰도_F: [17100000],
          }
        : records,
  })) as jest.Mock;
});
afterEach(() => jest.restoreAllMocks());
test("영어 표시 이름을 사용해도 참가자·DNF와 기록 순위는 원본 키로 계산", async () => {
  const english = localizeEvent(event, "en");
  expect(await calculateParticipants(english, 2025)).toEqual(
    await calculateParticipants(event, 2025),
  );
  expect(await calculateDNF(english, 2025)).toEqual(await calculateDNF(event, 2025));
  const ko = await getFindByRecordData("hongcheon", "granfondo", "2025", "045000", "full", "ko");
  const en = await getFindByRecordData("hongcheon", "granfondo", "2025", "045000", "full", "en");
  expect(ko?.rank).toBe(3);
  expect(en).toMatchObject({
    rank: ko?.rank,
    percentile: ko?.percentile,
    totalParticipants: ko?.totalParticipants,
    finishers: ko?.finishers,
  });
  const a = await getYearStatsWithCourses(event, "/tmp");
  const b = await getYearStatsWithCourses(english, "/tmp");
  expect(b[0].distributions[0].courseName).toBe("Gran Fondo");
  expect(b[0].distributions[0].distribution).toEqual(a[0].distributions[0].distribution);
});
