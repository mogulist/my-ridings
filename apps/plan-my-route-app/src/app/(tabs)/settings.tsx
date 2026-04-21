import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { clearStoredAccessToken } from '@/features/auth/session';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic">
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          계정
        </ThemedText>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={async () => {
            await clearStoredAccessToken();
            router.replace('/login');
          }}>
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    width: '100%',
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
  row: {
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
