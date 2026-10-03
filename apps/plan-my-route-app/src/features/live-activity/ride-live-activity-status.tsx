import { useState, useSyncExternalStore } from "react";
import { Linking, Platform, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

import { pauseRideTracking, resumeRideTracking } from "./ride-tracking";
import { getRideTrackingStatus, subscribeRideTracking } from "./ride-tracking-state";

export function RideLiveActivityStatus({ planId }: { planId?: string }) {
  const status = useSyncExternalStore(
    subscribeRideTracking,
    getRideTrackingStatus,
    getRideTrackingStatus,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  if (Platform.OS !== "ios" || !status.planId || (planId && status.planId !== planId)) return null;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (status.active && !status.paused) await pauseRideTracking();
      else await resumeRideTracking();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "실시간 현황을 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      style={{ padding: 12, gap: 6, borderRadius: 12, backgroundColor: theme.backgroundElement }}
    >
      <ThemedText type="smallBold">잠금화면 보급정보</ThemedText>
      <ThemedText type="caption" selectable>
        {status.message}
        {status.active ? (status.background ? " · 잠금 중 자동 갱신" : " · 앱 사용 중 갱신") : ""}
      </ThemedText>
      {error || status.error ? (
        <ThemedText type="caption" themeColor="danger" selectable>
          {error ?? status.error}
        </ThemedText>
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary" selectable>
        거리·획득고도는 경로 기준입니다. 8시간 이상 라이딩하면 휴식 중 앱을 열어 주세요. 앱을 강제
        종료하면 위치 갱신이 멈춥니다.
      </ThemedText>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void toggle()}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <ThemedText type="smallBold" themeColor="tint">
            {busy ? "처리 중…" : status.active && !status.paused ? "일시 정지" : "다시 시작"}
          </ThemedText>
        </Pressable>
        {!status.background || status.error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setError("iPhone 설정에서 위치·실시간 현황을 허용해 주세요."),
              )
            }
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <ThemedText type="smallBold" themeColor="tint">
              iPhone 설정
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
