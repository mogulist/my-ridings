import type { Event } from "@/lib/types";
import { getFilteredEvents } from "@/app/eventFilter";
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
