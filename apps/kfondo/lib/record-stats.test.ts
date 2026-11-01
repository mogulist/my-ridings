import { generateTimeDistributionFromRecords } from "./record-stats";
import type { RaceRecord } from "./types";

const row = (timeInSeconds: number, status = "", event = "그란폰도"): RaceRecord => ({
  bibNo: "1", gender: "M", event, time: "", timeInSeconds, status,
});

test("구간 경계와 소수 초, DNF 및 DNS의 기존 집계를 유지한다", () => {
  const records = [row(3600), row(3719.99), row(3720), row(4000, "DNF"),
    row(4000, "DNS"), row(7200, "", "메디오폰도")];
  const result = generateTimeDistributionFromRecords(records, "그란폰도", 2);
  expect(result.map((r) => r.participants)).toEqual([0, 0, 0, 2, 1, 0, 0]);
  expect(result.map((r) => r.cumulativeCount)).toEqual([0, 0, 0, 2, 3, 3, 3]);
  expect(result.map((r) => r.percentile)).toEqual([0, 0, 0, 50, 75, 75, 75]);
  expect(result[3].timeRange).toBe("1:00 - 1:02");
  expect(result[4].timeRange).toBe("1:02 - 1:04");
});

test("KOM 이름과 완주 기록 없는 코스의 집계를 유지한다", () => {
  const records = [row(3600, "", "그란폰도(KOM)"), row(3720), row(0, "DNS")];
  const result = generateTimeDistributionFromRecords(records, "그란폰도", 5, undefined, undefined,
    { matchKomEventLabel: true });
  expect(result.reduce((n, r) => n + r.participants, 0)).toBe(2);
  expect(result.at(-1)?.percentile).toBe(100);
  expect(generateTimeDistributionFromRecords([row(0, "DNF")], "그란폰도")).toEqual([]);
});
