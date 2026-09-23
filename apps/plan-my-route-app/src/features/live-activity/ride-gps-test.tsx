import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { PlanDetail } from "@/features/api/plan-my-route";
import {
  finishActiveRide,
  getActiveRide,
  startActiveRide,
} from "@/features/navigation/active-ride";
import { planDetailQueryKey } from "@/features/plan-my-route/plan-detail-query";

import { RideLiveActivityStatus } from "./ride-live-activity-status";
import { syncRideTracking } from "./ride-tracking";

const PLAN_ID = "local-gps-test";

/** Development-only fixture: real GPS and activity lifecycle, without server/login. */
export function RideGpsTest() {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!__DEV__) return null;

  const run = async (start: boolean) => {
    setBusy(true);
    try {
      const existing = await getActiveRide();
      if (existing && existing.planId !== PLAN_ID) {
        setMessage("실제 라이딩을 종료한 뒤 개발용 검증을 시작하세요.");
        return;
      }
      if (start) {
        const detail = {
          plan: { id: PLAN_ID },
          knownRouteElevationGainM: 100,
          trackPoints: Array.from({ length: 101 }, (_, index) => ({
            x: 127 + index / 1000,
            y: 37,
            d: index * 100,
            e: index,
          })),
          stages: [{ id: "local-stage", start_distance: 0, end_distance: 10000 }],
          planPois: [3, 5, 8].map((km) => ({
            id: `local-${km}`,
            name: `검증 보급소 ${km}`,
            lat: 37,
            lng: 127 + km / 100,
            poi_type: "convenience",
            intent: "planned",
            assignment_mode: "distance",
          })),
        } as PlanDetail;
        client.setQueryDefaults(planDetailQueryKey(PLAN_ID), { staleTime: Infinity });
        client.setQueryData(planDetailQueryKey(PLAN_ID), detail);
        const ride = await startActiveRide({
          routeId: "local-gps-test",
          planId: PLAN_ID,
          routeName: "GPS 검증",
          planName: "GPS 검증",
        });
        await syncRideTracking(ride, detail);
        setMessage("실제 GPS 추적 시작. 시뮬레이터 위치를 37,127.01로 설정하세요.");
      } else {
        await finishActiveRide();
        await syncRideTracking(null);
        setMessage("검증 라이딩과 위치 추적 종료");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검증 실패");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="smallBold">개발용: 실제 GPS 파이프라인 검증</ThemedText>
      <ThemedText type="caption">
        가상 경로에 실제 위치 이벤트를 적용합니다. 서버 데이터는 변경하지 않습니다.
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void run(true)}
        style={{ minHeight: 44 }}
      >
        <ThemedText themeColor="tint">GPS 검증 시작</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void run(false)}
        style={{ minHeight: 44 }}
      >
        <ThemedText themeColor="tint">GPS 검증 종료</ThemedText>
      </Pressable>
      <ThemedText type="caption">{message}</ThemedText>
      <RideLiveActivityStatus planId={PLAN_ID} />
    </View>
  );
}
