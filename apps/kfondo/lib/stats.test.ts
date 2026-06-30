import path from "path";
import { getYearStats, getYearStatsWithCourses } from "./stats";
import { events } from "../events.config";

const statsFixtureDir = path.join(
  __dirname,
  "../tests/fixtures/stats-record-files",
);

describe("분포 변환 함수 비교", () => {
  it("2025년 홍천 그란폰도의 granfondo/mediofondo distribution이 동일해야 한다", async () => {
    const event = events.find((e) => e.id === "hongcheon")!;
    const dataDir = statsFixtureDir;

    const oldStats = await getYearStats(event, dataDir);
    const newStats = await getYearStatsWithCourses(event, dataDir);

    const old2025 = oldStats.find((y) => y.year === 2025);
    const new2025 = newStats.find((y) => y.year === 2025);
    expect(old2025).toBeDefined();
    expect(new2025).toBeDefined();

    const granDist = new2025?.distributions.find(
      (d) => d.courseId === "granfondo",
    );
    expect(granDist?.distribution).toEqual(old2025?.granFondoDistribution);

    const medioDist = new2025?.distributions.find(
      (d) => d.courseId === "mediofondo",
    );
    expect(medioDist?.distribution).toEqual(old2025?.medioFondoDistribution);
  });

  it("2025년 설악 그란폰도의 granfondo/mediofondo distribution이 동일해야 한다", async () => {
    const event = events.find((e) => e.id === "seorak")!;
    const dataDir = statsFixtureDir;

    const oldStats = await getYearStats(event, dataDir);
    const newStats = await getYearStatsWithCourses(event, dataDir);

    const old2025 = oldStats.find((y) => y.year === 2025);
    const new2025 = newStats.find((y) => y.year === 2025);
    expect(old2025).toBeDefined();
    expect(new2025).toBeDefined();

    const granDist = new2025?.distributions.find(
      (d) => d.courseId === "granfondo",
    );
    expect(granDist?.distribution).toEqual(old2025?.granFondoDistribution);

    const medioDist = new2025?.distributions.find(
      (d) => d.courseId === "mediofondo",
    );
    expect(medioDist?.distribution).toEqual(old2025?.medioFondoDistribution);
  });
});
