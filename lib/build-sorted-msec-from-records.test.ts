import { buildSortedMsecFromRecords } from "./build-sorted-msec-from-records";

describe("buildSortedMsecFromRecords", () => {
  it("builds combined and gender keys and sorts", () => {
    const records = [
      {
        Time: "01:00:00",
        Event: "그란폰도",
        Gender: "M",
      },
      {
        Time: "01:00:05",
        Event: "그란폰도",
        Gender: "F",
      },
      {
        Time: "01:00:10",
        Event: "그란폰도",
        Gender: "M",
      },
      { Time: "DNF", Event: "그란폰도", Gender: "M" },
    ];
    const out = buildSortedMsecFromRecords(records);
    expect(out["그란폰도"]).toEqual([
      3600 * 1000,
      3605 * 1000,
      3610 * 1000,
    ]);
    expect(out["그란폰도_M"]).toEqual([3600 * 1000, 3610 * 1000]);
    expect(out["그란폰도_F"]).toEqual([3605 * 1000]);
  });
});
