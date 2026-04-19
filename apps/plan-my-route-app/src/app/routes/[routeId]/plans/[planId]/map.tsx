import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function PlanMapWebFallbackScreen() {
  const { routeId, planId } = useLocalSearchParams<{ routeId: string; planId: string }>();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">맵</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          네이버 지도는 iOS/Android 개발 빌드에서 표시됩니다.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          routeId: {routeId ?? '-'} · planId: {planId ?? '-'}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
});
