import { getDaysUntilEvent } from "./date";

describe("getDaysUntilEvent", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("이벤트 전날 밤에도 D-1(1)을 반환한다", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-27T23:52:00+09:00"));

    expect(getDaysUntilEvent("2026.6.28")).toBe(1);
  });

  it("이벤트 당일에는 D-Day(0)을 반환한다", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-28T15:00:00+09:00"));

    expect(getDaysUntilEvent("2026.6.28")).toBe(0);
  });

  it("이벤트 다음날부터는 음수를 반환한다", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-29T09:00:00+09:00"));

    expect(getDaysUntilEvent("2026.6.28")).toBe(-1);
  });
});
