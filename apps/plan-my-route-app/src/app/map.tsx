import React from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function MapScreen() {
  const { routeId, planId } = useLocalSearchParams<{ routeId?: string; planId?: string }>();

  return (
    <ThemedView style={styles.root}>
      <ThemedText type="default" style={styles.text}>
        네이버 지도는 iOS/Android 개발 빌드에서 표시됩니다.
      </ThemedText>
      <ThemedText type="small" style={styles.subText} themeColor="textSecondary">
        routeId: {routeId ?? '-'} / planId: {planId ?? '-'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  text: {
    textAlign: 'center',
  },
  subText: {
    textAlign: 'center',
  },
});
