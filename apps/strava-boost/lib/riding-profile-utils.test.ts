import { expect, test } from "bun:test";
import {
  downsample,
  buildChartData,
  formatDistanceAxis,
  formatRelativeTimeAxis,
  formatAbsoluteTimeAxis,
  formatAbsoluteTimeTooltip,
} from "./riding-profile-utils";
import type { ActivityStreams } from "../src/types";

test("downsample: 최대 포인트 이하면 그대로 반환", () => {
  const arr = [1, 2, 3];
  expect(downsample(arr, 10)).toEqual([1, 2, 3]);
});

test("downsample: maxPoints로 줄임", () => {
  const arr = Array.from({ length: 5000 }, (_, i) => i);
  expect(downsample(arr, 2000)).toHaveLength(2000);
});

test("buildChartData: 단위 변환 및 절대 시각 계산", () => {
  const streams: ActivityStreams = {
    activityId: 1,
    altitude: [100, 200],
    distance: [0, 1000],
    time: [0, 60],
  };
  const startMs = new Date(2025, 0, 1, 9, 0, 0).getTime();
  const result = buildChartData(streams, startMs);

  expect(result[0].distanceKm).toBe(0);
  expect(result[1].distanceKm).toBe(1);
  expect(result[0].elapsedSeconds).toBe(0);
  expect(result[1].elapsedSeconds).toBe(60);
  expect(result[1].absoluteMs).toBe(startMs + 60 * 1000);
  expect(result[0].altitude).toBe(100);
});

test("buildChartData: 길이가 다를 때 짧은 쪽 기준", () => {
  const streams: ActivityStreams = {
    activityId: 2,
    altitude: [100, 200, 300],
    distance: [0, 500],
    time: [0, 30],
  };
  expect(buildChartData(streams, 0)).toHaveLength(2);
});

test("formatDistanceAxis: 정수 km", () => {
  expect(formatDistanceAxis(20)).toBe("20 km");
});

test("formatDistanceAxis: 소수 km", () => {
  expect(formatDistanceAxis(20.3)).toBe("20.3 km");
});

test("formatRelativeTimeAxis: 1시간 미만", () => {
  expect(formatRelativeTimeAxis(45 * 60)).toBe("45분");
});

test("formatRelativeTimeAxis: 1시간 이상", () => {
  expect(formatRelativeTimeAxis(90 * 60)).toBe("1:30");
});

test("formatRelativeTimeAxis: 분 한 자리수 패딩", () => {
  expect(formatRelativeTimeAxis(60 * 60 + 5 * 60)).toBe("1:05");
});

test("formatAbsoluteTimeAxis: HH:MM 형식", () => {
  const d = new Date(2025, 0, 1, 9, 15, 0);
  expect(formatAbsoluteTimeAxis(d.getTime())).toBe("09:15");
});

test("formatAbsoluteTimeTooltip: HH:MM:SS 형식", () => {
  const d = new Date(2025, 0, 1, 9, 15, 30);
  expect(formatAbsoluteTimeTooltip(d.getTime())).toBe("09:15:30");
});
