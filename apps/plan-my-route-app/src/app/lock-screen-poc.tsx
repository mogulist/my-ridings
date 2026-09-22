import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Snackbar } from "@/components/snackbar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { ListItemCard } from "@/components/ui/list-item-card";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import type { MockRidePhase } from "@/features/live-activity/mock-ride-snapshots";
import {
  advanceMockRideLiveActivity,
  endMockRideLiveActivity,
  startMockRideLiveActivity,
} from "@/features/live-activity/ride-live-activity-actions";
import { useTheme } from "@/hooks/use-theme";

type PendingAction = "start" | "advance" | "end" | null;

export default function LockScreenPocScreen() {
  const theme = useTheme();
  const [phase, setPhase] = useState<MockRidePhase | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (
    action: Exclude<PendingAction, null>,
    operation: () => ReturnType<typeof startMockRideLiveActivity>,
  ) => {
    setPendingAction(action);
    try {
      const result = await operation();
      setPhase(result.phase);
      setMessage(result.message);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Live Activity를 변경하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "잠금화면 PoC" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.inner}>
          <ListItemCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewIcon, { backgroundColor: `${theme.tint}18` }]}>
                <AppIcon name="lock.fill" size={22} tintColor={theme.tint} />
              </View>
              <View style={styles.previewHeaderText}>
                <ThemedText type="headline" selectable>
                  라이딩 Live Activity
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" selectable>
                  실제 위치 대신 세 가지 목 상태를 사용합니다.
                </ThemedText>
              </View>
            </View>

            <View style={[styles.statusBox, { backgroundColor: theme.surface }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                현재 목 상태
              </ThemedText>
              <ThemedText type="smallBold" selectable>
                {phaseLabel(phase)}
              </ThemedText>
            </View>

            <ThemedText type="small" themeColor="textSecondary" selectable>
              시작한 뒤 시뮬레이터를 잠그면 잠금화면 배너가 나타납니다. “다음 상태”를 누르면 라이딩
              → 보급 도착 → 숙박 결정 순으로 내용이 바뀝니다.
            </ThemedText>
          </ListItemCard>

          <View style={styles.actions}>
            <ActionButton
              label="목 라이딩 시작"
              icon="play.fill"
              disabled={pendingAction != null}
              loading={pendingAction === "start"}
              backgroundColor={theme.tint}
              onPress={() => void run("start", startMockRideLiveActivity)}
            />
            <ActionButton
              label="다음 상태"
              icon="arrow.right.circle.fill"
              disabled={pendingAction != null}
              loading={pendingAction === "advance"}
              backgroundColor={theme.warning}
              onPress={() => void run("advance", advanceMockRideLiveActivity)}
            />
            <ActionButton
              label="종료"
              icon="stop.fill"
              disabled={pendingAction != null}
              loading={pendingAction === "end"}
              backgroundColor={theme.textSecondary}
              onPress={() => void run("end", endMockRideLiveActivity)}
            />
          </View>

          <ThemedText type="caption" themeColor="textSecondary" selectable>
            PoC 범위: 잠금화면 배너와 Dynamic Island의 크기·정보 밀도 확인. 백그라운드 위치 추적과
            실제 라이딩 연결은 포함하지 않습니다.
          </ThemedText>
        </View>
      </ScrollView>
      <Snackbar message={message} onDismiss={() => setMessage(null)} />
    </ThemedView>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  loading,
  backgroundColor,
  onPress,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  loading: boolean;
  backgroundColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <AppIcon name={icon} size={18} tintColor="#FFFFFF" />
      )}
      <ThemedText type="smallBold" style={styles.actionLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function phaseLabel(phase: MockRidePhase | null): string {
  if (phase === "ride") return "라이딩 중";
  if (phase === "supply") return "보급 후보 도착";
  if (phase === "lodging") return "숙박 결정";
  return "시작 전";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  previewCard: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  previewHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  statusBox: {
    borderRadius: Radius.md,
    borderCurve: "continuous",
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderCurve: "continuous",
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  actionLabel: {
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
  },
});
