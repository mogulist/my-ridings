import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  getActiveRide,
  subscribeActiveRide,
  type ActiveRide,
} from "@/features/navigation/active-ride";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";

import { refreshRideTracking, syncRideTracking } from "./ride-tracking";
import { setRideTrackingStatus } from "./ride-tracking-state";

/** Mounted once above navigation; background task registration happens when ride-tracking is imported. */
export function RideLiveActivityController() {
  const [ride, setRide] = useState<ActiveRide | null | undefined>(undefined);
  const { data, error } = usePlanDetailQuery(ride?.planId);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let revision = 0;
    const load = () => {
      const current = ++revision;
      void getActiveRide()
        .then((value) => {
          if (current === revision) setRide(value);
        })
        .catch(reportError);
    };
    const unsubscribe = subscribeActiveRide(load);
    load();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        load();
        void refreshRideTracking().catch(reportError);
      }
    });
    // Foreground-only check renews long rides and shows stale GPS explicitly.
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refreshRideTracking().catch(reportError);
    }, 60_000);
    return () => {
      revision++;
      unsubscribe();
      appState.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios" || ride === undefined) return;
    void syncRideTracking(ride, data).catch(reportError);
  }, [ride, data]);

  useEffect(() => {
    if (ride && error)
      setRideTrackingStatus({
        error: "경로를 새로 받지 못했습니다. 저장된 경로가 있으면 계속 사용합니다.",
      });
  }, [ride, error]);
  return null;
}

function reportError(error: unknown) {
  setRideTrackingStatus({
    error: error instanceof Error ? error.message : "실시간 현황을 시작하지 못했습니다.",
  });
}
