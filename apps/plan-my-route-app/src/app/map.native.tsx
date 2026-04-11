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

type MapCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const FALLBACK_CAMERA: MapCamera = {
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

  const initialCamera = getInitialCamera(routeLine);

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
    .filter(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.y >= -90 &&
        point.y <= 90 &&
        point.x >= -180 &&
        point.x <= 180 &&
        !(point.x === 0 && point.y === 0),
    )
    .map((point) => ({ latitude: point.y, longitude: point.x }));

const getInitialCamera = (coordinates: MapCoordinate[]): MapCamera => {
  if (coordinates.length === 0) return FALLBACK_CAMERA;

  const bounds = coordinates.reduce(
    (acc, coordinate) => ({
      minLat: Math.min(acc.minLat, coordinate.latitude),
      maxLat: Math.max(acc.maxLat, coordinate.latitude),
      minLng: Math.min(acc.minLng, coordinate.longitude),
      maxLng: Math.max(acc.maxLng, coordinate.longitude),
    }),
    {
      minLat: coordinates[0].latitude,
      maxLat: coordinates[0].latitude,
      minLng: coordinates[0].longitude,
      maxLng: coordinates[0].longitude,
    },
  );

  const latitudeDelta = Math.max(bounds.maxLat - bounds.minLat, 0.001);
  const longitudeDelta = Math.max(bounds.maxLng - bounds.minLng, 0.001);
  const maxDelta = Math.max(latitudeDelta, longitudeDelta);

  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2,
    zoom: getZoomFromDelta(maxDelta),
  };
};

const getZoomFromDelta = (delta: number) => {
  if (delta > 5) return 5;
  if (delta > 2) return 7;
  if (delta > 1) return 8;
  if (delta > 0.5) return 9;
  if (delta > 0.2) return 10;
  if (delta > 0.08) return 11;
  if (delta > 0.03) return 12;
  return 13;
};

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
