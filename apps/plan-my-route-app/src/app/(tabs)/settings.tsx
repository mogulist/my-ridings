import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ListItemCard } from "@/components/ui/list-item-card";
import { ListRow } from "@/components/ui/list-row";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { clearStoredAccessToken } from "@/features/auth/session";
import { RideLiveActivityStatus } from "@/features/live-activity/ride-live-activity-status";
import { syncRideTracking } from "@/features/live-activity/ride-tracking";
import { finishActiveRide } from "@/features/navigation/active-ride";
import { useTheme } from "@/hooks/use-theme";

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <RideLiveActivityStatus />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          실험실
        </ThemedText>
        <ListItemCard style={styles.card}>
          <ListRow
            label="잠금화면 Live Activity"
            value="목 데이터 PoC"
            iconName="lock.rectangle"
            showChevron
            isLast
            onPress={() => router.push("/lock-screen-poc")}
          />
        </ListItemCard>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          계정
        </ThemedText>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={async () => {
            await syncRideTracking(null);
            await finishActiveRide();
            await clearStoredAccessToken();
            router.replace("/login");
          }}
        >
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            로그아웃
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    paddingBottom: Spacing.one,
  },
  card: {
    marginBottom: Spacing.three,
  },
  row: {
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
