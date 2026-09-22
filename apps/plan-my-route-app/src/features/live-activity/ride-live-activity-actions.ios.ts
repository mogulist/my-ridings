import * as Linking from "expo-linking";

import {
  getMockRideSnapshot,
  getNextMockRidePhase,
  type MockRidePhase,
} from "./mock-ride-snapshots";
import RideLiveActivity from "./ride-live-activity.ios";

export type LiveActivityActionResult = {
  supported: boolean;
  message: string;
  phase: MockRidePhase | null;
};

let currentPhase: MockRidePhase = "ride";

export async function startMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  for (const instance of RideLiveActivity.getInstances()) {
    await instance.end("immediate");
  }

  currentPhase = "ride";
  RideLiveActivity.start(
    getMockRideSnapshot(currentPhase),
    Linking.createURL("/lock-screen-poc"),
  );
  return {
    supported: true,
    message: "목 라이딩을 잠금화면에 시작했습니다.",
    phase: currentPhase,
  };
}

export async function advanceMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  const instances = RideLiveActivity.getInstances();
  if (instances.length === 0) {
    return {
      supported: true,
      message: "먼저 목 라이딩을 시작해 주세요.",
      phase: null,
    };
  }

  currentPhase = getNextMockRidePhase(currentPhase);
  await Promise.all(
    instances.map((instance) => instance.update(getMockRideSnapshot(currentPhase))),
  );
  return {
    supported: true,
    message: `${getMockRideSnapshot(currentPhase).phaseLabel} 상태로 갱신했습니다.`,
    phase: currentPhase,
  };
}

export async function endMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  const instances = RideLiveActivity.getInstances();
  await Promise.all(instances.map((instance) => instance.end("immediate")));
  return {
    supported: true,
    message:
      instances.length > 0
        ? "잠금화면 목 라이딩을 종료했습니다."
        : "실행 중인 목 라이딩이 없습니다.",
    phase: null,
  };
}
