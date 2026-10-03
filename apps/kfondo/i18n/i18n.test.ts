import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import { translated, localizeEvent } from "./content";
import { localePath, pageAlternates } from "./urls";
import { translator } from "./translator";
import { formatEventDate } from "./date";
import type { Event } from "@/lib/types";
import {
  filterRawEventsBySearch,
  mapToEventData,
  filterEventDataBySearch,
  splitUpcomingCarousels,
} from "@/app/eventFilter";
jest.mock("@/lib/db/events", () => ({ getAllEvents: jest.fn() }));
const event: Event = {
  id: "hongcheon",
  name: "홍천 그란폰도",
  nameEn: "Hongcheon Gran Fondo",
  location: "홍천",
  locationEn: "Hongcheon",
  years: [2025],
  status: "completed",
  color: { from: "", to: "" },
  meta: { title: "", description: "", image: "" },
  yearDetails: {
    2025: {
      year: 2025,
      date: "2025.04.20",
      totalRegistered: 100,
      notice: "원문",
      noticeEn: "Notice",
      courses: [{ id: "granfondo", name: "그란폰도", nameEn: "Gran Fondo", distance: 120 }],
    },
  },
};
function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value)
    .flatMap(([key, v]) =>
      typeof v === "object" && v !== null
        ? keys(v as Record<string, unknown>, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();
}
test("양언어 메시지 키와 ICU 인자 일치", () => {
  expect(keys(ko)).toEqual(keys(en));
  const tk = translator("ko"),
    te = translator("en");
  expect(te("event.yearCount", { v0: 1 })).toBe("1 year of results");
  expect(te("event.yearCount", { v0: 2 })).toBe("2 years of results");
  expect(tk("record.rankValue", { v0: 541 })).toBe("541위");
  expect(te("record.rankValue", { v0: 541 })).toBe("#541");
  for (const key of keys(ko)) {
    const args = {
      v0: 2,
      v1: 3,
      v2: 4,
      name: "Test",
      course: "Gran Fondo",
      year: 2025,
      month: "October",
      min: 1,
      max: 9,
    };
    expect(() => tk(key as Parameters<typeof tk>[0], args)).not.toThrow();
    expect(() => te(key as Parameters<typeof te>[0], args)).not.toThrow();
  }
});
test("영어 콘텐츠 폴백과 원본 이름 보존", () => {
  expect(translated("원문", "  ", "en")).toBe("원문");
  expect(translated("원문", " English ", "en")).toBe("English");
  const english = localizeEvent(event, "en");
  expect(english.name).toBe("Hongcheon Gran Fondo");
  expect(english.originalName).toBe("홍천 그란폰도");
  expect(english.yearDetails[2025].courses[0]).toMatchObject({
    name: "Gran Fondo",
    originalName: "그란폰도",
  });
  expect(english.yearDetails[2025].notice).toBe("Notice");
  expect(event.name).toBe("홍천 그란폰도");
});
test("영어와 한국어 이름·지역·slug 모두 검색", () => {
  const english = localizeEvent(event, "en");
  for (const query of ["홍천", "hongCHEON", "Gran Fondo"]) {
    expect(filterRawEventsBySearch([english], query)).toHaveLength(1);
    expect(filterEventDataBySearch([mapToEventData(english, "en")], query)).toHaveLength(1);
  }
  expect(filterRawEventsBySearch([english], "없는 대회")).toHaveLength(0);
});
test("locale URL·canonical은 query와 hash를 보존", () => {
  expect(localePath("/hongcheon?year=2025#course", "en")).toBe("/en/hongcheon?year=2025#course");
  expect(localePath("/en/hongcheon?year=2025", "ko")).toBe("/hongcheon?year=2025");
  expect(pageAlternates("/en/hongcheon", "en")).toMatchObject({
    canonical: "https://kfondo.cc/en/hongcheon",
    languages: { ko: "https://kfondo.cc/hongcheon" },
  });
});
test("월별 그룹은 표시 언어와 무관한 구조를 유지", () => {
  const card = mapToEventData(event);
  const groups = splitUpcomingCarousels(
    Array.from({ length: 7 }, (_, i) => ({
      ...card,
      id: String(i),
      date: `2026.10.${String(i + 1).padStart(2, "0")}`,
    })),
  );
  expect(groups.every((g) => g.month === 9)).toBe(true);
  expect(groups[0]).toMatchObject({ minDay: 1, maxDay: 4 });
  expect(formatEventDate("2026.10.02", "en")).toBe("2 Oct 2026");
});
