export type MockRidePhase = "ride" | "supply" | "lodging";

export type RideLiveActivityProps = {
  phase: MockRidePhase;
  phaseLabel: string;
  stageLabel: string;
  progress: number;
  progressLabel: string;
  remainingLabel: string;
  primaryLabel: string;
  primaryName: string;
  primaryDistance: string;
  secondaryLabel: string;
  secondaryValue: string;
  accentColor: string;
};

export const MOCK_RIDE_PHASES: readonly MockRidePhase[] = ["ride", "supply", "lodging"];

const MOCK_RIDE_SNAPSHOTS: Record<MockRidePhase, RideLiveActivityProps> = {
  ride: {
    phase: "ride",
    phaseLabel: "라이딩",
    stageLabel: "스테이지 2",
    progress: 0.56,
    progressLabel: "124.8 / 223.9",
    remainingLabel: "99.1 남음",
    primaryLabel: "다음 보급",
    primaryName: "CU 사천면점",
    primaryDistance: "11.8 km",
    secondaryLabel: "다음 오르막까지 4.2 km",
    secondaryValue: "4.8 km · +430 m",
    accentColor: "#FF9500",
  },
  supply: {
    phase: "supply",
    phaseLabel: "보급 결정",
    stageLabel: "스테이지 2",
    progress: 0.61,
    progressLabel: "136.2 / 223.9",
    remainingLabel: "87.7 남음",
    primaryLabel: "보급 후보 도착",
    primaryName: "CU 사천면점",
    primaryDistance: "0.4 km",
    secondaryLabel: "다음 후보까지 18.6 km",
    secondaryValue: "GS25 정선점",
    accentColor: "#FF9500",
  },
  lodging: {
    phase: "lodging",
    phaseLabel: "숙박 결정",
    stageLabel: "스테이지 2",
    progress: 0.91,
    progressLabel: "203.8 / 223.9",
    remainingLabel: "20.1 남음",
    primaryLabel: "다음 숙박 선택지",
    primaryName: "호텔 라핀 외 1곳",
    primaryDistance: "7.0 km",
    secondaryLabel: "선택지까지 남은 오르막",
    secondaryValue: "+85 m",
    accentColor: "#FF9F0A",
  },
};

export function getMockRideSnapshot(phase: MockRidePhase): RideLiveActivityProps {
  return MOCK_RIDE_SNAPSHOTS[phase];
}

export function getNextMockRidePhase(phase: MockRidePhase): MockRidePhase {
  const index = MOCK_RIDE_PHASES.indexOf(phase);
  return MOCK_RIDE_PHASES[(index + 1) % MOCK_RIDE_PHASES.length];
}
