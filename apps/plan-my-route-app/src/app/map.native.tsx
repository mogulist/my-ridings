import { NaverMapView } from '@mj-studio/react-native-naver-map';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

const INITIAL_REGION = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function MapScreen() {
  useEffect(() => {
    const len = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.length ?? 0;
    const raw = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
    const preview =
      raw && len > 5
        ? `${raw.slice(0, 3)}…${raw.slice(-2)}`
        : raw || '(empty — Metro 인라인 실패 또는 미설정)';
    console.log('[naver-map] JS bundle — EXPO_PUBLIC_NAVER_MAP_CLIENT_ID:', {
      isSet: Boolean(process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID),
      length: len,
      preview,
    });
    console.log(
      '[naver-map] 타일은 네이티브(빌드 시 Info.plist) Client ID를 씁니다. JS에 값이 있어도 예전 Dev Client면 지도가 비어 있을 수 있어 재빌드가 필요할 수 있습니다.',
    );
  }, []);

  return (
    <View style={styles.root}>
      <NaverMapView style={styles.map} initialRegion={INITIAL_REGION} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
