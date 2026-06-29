import { getEventParticipantTrend } from "./participants";
import { events } from "../events.config";

const yangyangTrend = [
  {
    id: "granfondo",
    name: "그란폰도",
    yearlyData: [
      {
        year: 2025,
        registered: 1241,
        participants: 1011,
        dnf: 188,
        participationRate: "81.5",
        completionRate: "81.4",
      },
      {
        year: 2024,
        registered: 1200,
        participants: 975,
        dnf: 172,
        participationRate: "81.3",
        completionRate: "82.4",
      },
    ],
  },
  {
    id: "mediofondo",
    name: "메디오폰도",
    yearlyData: [
      {
        year: 2025,
        registered: 809,
        participants: 672,
        dnf: 71,
        participationRate: "83.1",
        completionRate: "89.4",
      },
      {
        year: 2024,
        registered: 700,
        participants: 576,
        dnf: 143,
        participationRate: "82.3",
        completionRate: "75.2",
      },
    ],
  },
];

const hongcheonTrend = [
  {
    id: "granfondo",
    name: "그란폰도",
    yearlyData: [
      {
        year: 2025,
        registered: 1876,
        participants: 1202,
        dnf: 82,
        participationRate: "64.1",
        completionRate: "93.2",
      },
      {
        year: 2024,
        registered: 1986,
        participants: 1607,
        dnf: 67,
        participationRate: "80.9",
        completionRate: "95.8",
      },
      {
        year: 2023,
        registered: 2580,
        participants: 2230,
        dnf: 144,
        participationRate: "86.4",
        completionRate: "93.5",
      },
      {
        year: 2022,
        registered: 3228,
        participants: 730,
        dnf: 113,
        participationRate: "22.6",
        completionRate: "84.5",
      },
    ],
  },
  {
    id: "mediofondo",
    name: "메디오폰도",
    yearlyData: [
      {
        year: 2025,
        registered: 1204,
        participants: 1051,
        dnf: 27,
        participationRate: "87.3",
        completionRate: "97.4",
      },
      {
        year: 2024,
        registered: 1178,
        participants: 1026,
        dnf: 38,
        participationRate: "87.1",
        completionRate: "96.3",
      },
      {
        year: 2023,
        registered: 1350,
        participants: 1204,
        dnf: 38,
        participationRate: "89.2",
        completionRate: "96.8",
      },
      {
        year: 2022,
        registered: 772,
        participants: 161,
        dnf: 23,
        participationRate: "20.9",
        completionRate: "85.7",
      },
    ],
  },
];

describe("getEventParticipantTrend", () => {
  it("should return correct trend for Yangyang Granfondo", () => {
    const yangyangEvent = events.find((e) => e.id === "yangyang");
    expect(yangyangEvent).toBeDefined();

    const trend = getEventParticipantTrend(yangyangEvent!);
    expect(trend).toEqual(yangyangTrend);
  });

  it("should return correct trend for Hongcheon Granfondo", () => {
    const hongcheonEvent = events.find((e) => e.id === "hongcheon");
    expect(hongcheonEvent).toBeDefined();

    const trend = getEventParticipantTrend(hongcheonEvent!);
    expect(trend).toEqual(hongcheonTrend);
  });
});
