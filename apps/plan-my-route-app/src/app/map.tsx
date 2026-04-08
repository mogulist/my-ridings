import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function MapScreen() {
  return (
    <ThemedView style={styles.root}>
      <ThemedText type="default" style={styles.text}>
        카카오 지도는 iOS/Android 개발 빌드에서 표시됩니다.
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
});
