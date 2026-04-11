import { NaverMapPathOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  fetchRideWithGpsTrackPoints,
  fetchRouteDetail,
  type TrackPoint,
} from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

const INITIAL_CAMERA = {
  latitude: 37.5665,
  longitude: 126.978,
  zoom: 12,
};

export default function MapScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId: string; planId?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeLine, setRouteLine] = useState<MapCoordinate[]>([]);
  const apiOrigin = useMemo(getApiOrigin, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!routeId) {
        setErrorMessage('routeId가 필요합니다.');
        setIsLoading(false);
        return;
      }
      try {
        const accessToken = await getStoredAccessToken();
        if (!accessToken) {
          router.replace('/login');
          return;
        }
        if (!apiOrigin) throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');

        const route = await fetchRouteDetail(apiOrigin, accessToken, routeId);
        const trackPoints = await fetchRideWithGpsTrackPoints(apiOrigin, route.rwgps_url);
        if (!isMounted) return;
        setRouteLine(toMapCoordinates(trackPoints));
      } catch (error: unknown) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : '맵 경로를 불러오지 못했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [apiOrigin, routeId, router]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (errorMessage || routeLine.length === 0) {
    return (
      <ThemedView style={styles.messageContainer}>
        <SafeAreaView>
          <ThemedText type="default">{errorMessage ?? '표시할 라우트가 없습니다.'}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const initialCamera = {
    ...INITIAL_CAMERA,
    latitude: routeLine[0].latitude,
    longitude: routeLine[0].longitude,
  };

  return (
    <View style={styles.root}>
      <NaverMapView style={styles.map} initialCamera={initialCamera}>
        <NaverMapPathOverlay
          coords={routeLine}
          width={4}
          color="#2D7EF7"
          outlineWidth={1}
          outlineColor="#174AA0"
        />
      </NaverMapView>
    </View>
  );
}

const toMapCoordinates = (trackPoints: TrackPoint[]): MapCoordinate[] =>
  trackPoints
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({ latitude: point.y, longitude: point.x }));

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
