import type { RaceRecord } from "./types";
import {
  filterRaceRecordsByGender,
  normalizeGenderLabel,
} from "./record-gender-filter";

const mk = (gender: string): RaceRecord => ({
  bibNo: "1",
  gender,
  event: "그란폰도",
  time: "03:00:00",
  status: "",
  timeInSeconds: 10800,
});

describe("normalizeGenderLabel", () => {
  it("maps common male labels", () => {
    expect(normalizeGenderLabel("M")).toBe("male");
    expect(normalizeGenderLabel("m")).toBe("male");
    expect(normalizeGenderLabel("male")).toBe("male");
    expect(normalizeGenderLabel("남")).toBe("male");
  });

  it("maps common female labels", () => {
    expect(normalizeGenderLabel("F")).toBe("female");
    expect(normalizeGenderLabel("W")).toBe("female");
    expect(normalizeGenderLabel("female")).toBe("female");
    expect(normalizeGenderLabel("여")).toBe("female");
  });

  it("returns null for empty or unknown", () => {
    expect(normalizeGenderLabel("")).toBe(null);
    expect(normalizeGenderLabel("  ")).toBe(null);
    expect(normalizeGenderLabel("???")).toBe(null);
  });
});

describe("filterRaceRecordsByGender", () => {
  const rows: RaceRecord[] = [
    mk("M"),
    mk("F"),
    mk("W"),
    mk("male"),
    mk("female"),
    mk("남"),
    mk("여"),
    mk(""),
    mk("???"),
  ];

  it("open returns all", () => {
    expect(filterRaceRecordsByGender(rows, "open")).toHaveLength(rows.length);
  });

  it("male keeps M/male/남 (case-insensitive M)", () => {
    const out = filterRaceRecordsByGender(rows, "male");
    expect(out.map((r) => r.gender).sort()).toEqual(
      ["M", "male", "남"].sort(),
    );
  });

  it("female keeps F/W/female/여", () => {
    const out = filterRaceRecordsByGender(rows, "female");
    expect(out.map((r) => r.gender).sort()).toEqual(
      ["F", "W", "female", "여"].sort(),
    );
  });
});
