import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchRouteDetail, type PlanItem } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function RoutePlansScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');
  const [plans, setPlans] = useState<PlanItem[]>([]);
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

        const routeDetail = await fetchRouteDetail(apiOrigin, accessToken, routeId);
        if (!isMounted) return;
        setRouteName(routeDetail.name);
        setPlans(routeDetail.plans);
      } catch (error: unknown) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : '플랜 목록을 불러오지 못했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiOrigin, routeId, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">{routeName || '플랜 목록'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            라우트의 플랜을 선택하세요.
          </ThemedText>

          {isLoading ? (
            <ThemedText type="small">불러오는 중...</ThemedText>
          ) : plans.length === 0 ? (
            <ThemedText type="small">플랜이 없습니다.</ThemedText>
          ) : (
            plans.map((plan) => (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}
                onPress={() =>
                  router.push({
                    pathname: '/map',
                    params: { routeId, planId: plan.id },
                  })
                }>
                <ThemedText type="smallBold">{plan.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {plan.start_date ?? plan.created_at ?? ''}
                </ThemedText>
              </Pressable>
            ))
          )}

          {errorMessage ? (
            <ThemedText type="small" style={styles.errorText}>
              {errorMessage}
            </ThemedText>
          ) : null}
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#A0A4AE',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.75,
  },
  errorText: {
    color: '#D64545',
  },
});
