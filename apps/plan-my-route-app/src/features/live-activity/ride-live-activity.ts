import type { MockRidePhase } from "./mock-ride-snapshots";

export type LiveActivityActionResult = {
  supported: boolean;
  message: string;
  phase: MockRidePhase | null;
};

const UNSUPPORTED: LiveActivityActionResult = {
  supported: false,
  message: "Live Activity는 iOS 개발 빌드에서만 확인할 수 있습니다.",
  phase: null,
};

export async function startMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  return UNSUPPORTED;
}

export async function advanceMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  return UNSUPPORTED;
}

export async function endMockRideLiveActivity(): Promise<LiveActivityActionResult> {
  return UNSUPPORTED;
}
