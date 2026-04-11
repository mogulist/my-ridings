import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  fetchRouteDetail,
  fetchRoutes,
  getFavoritePlans,
  type RouteItem,
} from '@/features/api/plan-my-route';
import { clearStoredAccessToken, getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type FavoritePlanCard = {
  routeId: string;
  routeName: string;
  planId: string;
  planName: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [favoritePlans, setFavoritePlans] = useState<FavoritePlanCard[]>([]);
  const apiOrigin = useMemo(getApiOrigin, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const accessToken = await getStoredAccessToken();
        if (!accessToken) {
          router.replace('/login');
          return;
        }
        if (!apiOrigin) {
          setErrorMessage('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');
          return;
        }

        const routeItems = await fetchRoutes(apiOrigin, accessToken);
        if (!isMounted) return;
        setRoutes(routeItems);

        const routeDetails = await Promise.all(
          routeItems.map((route) => fetchRouteDetail(apiOrigin, accessToken, route.id)),
        );
        if (!isMounted) return;
        setFavoritePlans(getFavoritePlans(routeDetails));
      } catch (error: unknown) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : '홈 데이터를 불러오지 못했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiOrigin, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.pageTitle}>
            Home
          </ThemedText>

          {favoritePlans.length > 0 ? (
            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="subtitle">즐겨찾기한 나의 플랜</ThemedText>
              {favoritePlans.map((favoritePlan) => (
                <Pressable
                  key={`${favoritePlan.routeId}:${favoritePlan.planId}`}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/map',
                      params: { routeId: favoritePlan.routeId, planId: favoritePlan.planId },
                    })
                  }>
                  <ThemedText type="smallBold">{favoritePlan.planName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {favoritePlan.routeName}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : null}

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="subtitle">나의 라우트</ThemedText>
            {isLoading ? (
              <ThemedText type="small">불러오는 중...</ThemedText>
            ) : routes.length === 0 ? (
              <ThemedText type="small">저장된 라우트가 없습니다.</ThemedText>
            ) : (
              routes.map((route) => (
                <Pressable
                  key={route.id}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  onPress={() => router.push(`/routes/${route.id}/plans`)}>
                  <ThemedText type="smallBold">{route.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {route.rwgps_url ?? ''}
                  </ThemedText>
                </Pressable>
              ))
            )}
            {errorMessage ? (
              <ThemedText type="small" style={styles.errorText}>
                {errorMessage}
              </ThemedText>
            ) : null}
          </ThemedView>

          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
            onPress={async () => {
              await clearStoredAccessToken();
              router.replace('/login');
            }}>
            <ThemedText type="smallBold">로그아웃</ThemedText>
          </Pressable>
        </ScrollView>
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  pageTitle: {
    fontSize: 40,
    lineHeight: 44,
  },
  section: {
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  card: {
    gap: Spacing.half,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#A0A4AE',
  },
  signOutButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A0A4AE',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
  errorText: {
    color: '#D64545',
  },
});
