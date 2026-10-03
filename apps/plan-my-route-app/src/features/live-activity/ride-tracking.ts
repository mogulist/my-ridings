import type { PlanDetail } from "@/features/api/plan-my-route";
import type { ActiveRide } from "@/features/navigation/active-ride";

import type { RideFix } from "./ride-supply-data";

// Live Activities are iOS-only. Keep native modules out of Android and web bundles.
export async function syncRideTracking(
  _ride: ActiveRide | null,
  _detail?: PlanDetail,
): Promise<void> {}
export async function refreshRideTracking(): Promise<void> {}
export async function pauseRideTracking(): Promise<void> {}
export async function resumeRideTracking(): Promise<void> {}
export async function updateRideLocation(_fix: RideFix): Promise<void> {}
