import type { Event } from "@/lib/types";
import type { EventData } from "@/components/EventCard";
import { getFilteredEvents, splitUpcomingCarousels } from "@/app/eventFilter";
import { getAllEvents } from "@/lib/db/events";

jest.mock("@/lib/db/events", () => ({
  getAllEvents: jest.fn(),
}));

const mockedGetAllEvents = getAllEvents as jest.MockedFunction<
  typeof getAllEvents
>;

const createEvent = ({
  id,
  date,
  totalRegistered,
}: {
  id: string;
  date: string;
  totalRegistered: number;
}): Event => ({
  id,
  location: id,
  name: id,
  years: [2026],
  color: { from: "#000000", to: "#111111" },
  status: "ready",
  meta: {
    title: id,
    description: id,
    image: "/test.png",
  },
  yearDetails: {
    2026: {
      year: 2026,
      date,
      status: "upcoming",
      courses: [
        {
          id: "granfondo",
          name: "그란폰도",
          distance: 100,
          elevation: 1000,
          registered: totalRegistered,
        },
      ],
      totalRegistered,
    },
  },
});

describe("getFilteredEvents", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-08T09:00:00+09:00"));
    mockedGetAllEvents.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("무기록 당일 이벤트를 다가오는 대회에 유지한다", async () => {
    mockedGetAllEvents.mockResolvedValue([
      createEvent({
        id: "same-day-no-record",
        date: "2026.3.8",
        totalRegistered: 0,
      }),
    ]);

    const result = await getFilteredEvents();
    const upcomingIds = result.upcomingCarousels.flatMap((c) =>
      c.events.map((e) => e.id),
    );

    expect(upcomingIds).toContain("same-day-no-record");
  });

  it("무기록 대회일+7 이벤트를 다가오는 대회에 유지한다", async () => {
    mockedGetAllEvents.mockResolvedValue([
      createEvent({
        id: "plus-seven-no-record",
        date: "2026.3.1",
        totalRegistered: 0,
      }),
    ]);

    const result = await getFilteredEvents();
    const upcomingIds = result.upcomingCarousels.flatMap((c) =>
      c.events.map((e) => e.id),
    );

    expect(upcomingIds).toContain("plus-seven-no-record");
  });

  it("무기록 대회일+8 이벤트를 전체 대회로 이동한다", async () => {
    mockedGetAllEvents.mockResolvedValue([
      createEvent({
        id: "plus-eight-no-record",
        date: "2026.2.28",
        totalRegistered: 0,
      }),
    ]);

    const result = await getFilteredEvents();
    const otherIds = result.otherEvents.map((e) => e.id);
    const upcomingIds = result.upcomingCarousels.flatMap((c) =>
      c.events.map((e) => e.id),
    );

    expect(otherIds).toContain("plus-eight-no-record");
    expect(upcomingIds).not.toContain("plus-eight-no-record");
  });

  it("기록이 생기면 최근 기록 업데이트로 이동한다", async () => {
    mockedGetAllEvents.mockResolvedValue([
      createEvent({
        id: "has-record",
        date: "2026.3.8",
        totalRegistered: 10,
      }),
    ]);

    const result = await getFilteredEvents();
    const recentIds = result.recentEvents.map((e) => e.id);
    const upcomingIds = result.upcomingCarousels.flatMap((c) =>
      c.events.map((e) => e.id),
    );

    expect(recentIds).toContain("has-record");
    expect(upcomingIds).not.toContain("has-record");
  });
});

describe("splitUpcomingCarousels", () => {
  const makeEventData = (id: string, date: string): EventData => ({
    id,
    name: id,
    status: "upcoming",
    date,
    years: ["2026"],
    categories: [],
    updatedAt: date,
    participants: undefined,
    dDay: 0,
  });

  it("이벤트가 6개 미만이면 하나의 캐로셀로 유지한다", () => {
    const events = [
      makeEventData("a", "2026.9.5"),
      makeEventData("b", "2026.10.3"),
    ];

    const result = splitUpcomingCarousels(events);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("다가오는 대회");
  });

  it("9월 이벤트는 10월 이벤트와 섞이지 않고 별도 캐로셀로 분리된다", () => {
    const events = [
      makeEventData("sep-1", "2026.9.5"),
      makeEventData("oct-1", "2026.10.1"),
      makeEventData("oct-2", "2026.10.2"),
      makeEventData("oct-3", "2026.10.3"),
      makeEventData("oct-4", "2026.10.4"),
      makeEventData("oct-5", "2026.10.5"),
      makeEventData("oct-6", "2026.10.6"),
      makeEventData("oct-7", "2026.10.7"),
      makeEventData("oct-8", "2026.10.8"),
      makeEventData("oct-9", "2026.10.9"),
    ];

    const result = splitUpcomingCarousels(events);

    // 9월 캐로셀은 9월 이벤트만 담고, 10월 이벤트로 채워지지 않는다.
    const sepCarousel = result.find((c) => c.title === "다가오는 대회 (9월)");
    expect(sepCarousel?.events.map((e) => e.id)).toEqual(["sep-1"]);

    // 10월(9개)은 threshold(6)를 넘으므로 여러 캐로셀로 분산되고, 각 캐로셀은 threshold 이내다.
    const octCarousels = result.filter((c) => c.title.startsWith("다가오는 대회 (10월"));
    expect(octCarousels.length).toBeGreaterThan(1);
    for (const carousel of octCarousels) {
      expect(carousel.events.length).toBeLessThanOrEqual(6);
    }

    const allIds = result.flatMap((c) => c.events.map((e) => e.id));
    expect(allIds).toEqual(events.map((e) => e.id));
  });

  it("한 달에 이벤트가 몰리면 날짜 구간으로 나누고 제목에 실제 날짜 범위를 표시한다", () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEventData(`oct-${i + 1}`, `2026.10.${i + 1}`)
    );

    const result = splitUpcomingCarousels(events);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("다가오는 대회 (10월 1~6일)");
    expect(result[1].title).toBe("다가오는 대회 (10월 7~12일)");
    // 제목이 서로 달라 React key 충돌도 발생하지 않는다.
    expect(result[0].title).not.toBe(result[1].title);
  });
});
