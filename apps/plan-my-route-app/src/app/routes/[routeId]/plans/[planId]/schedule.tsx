import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchPlanDetail, type PlanDetail } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';

/** 플로팅 pill·탭바와 겹치지 않도록 하단 여백 */
const FLOATING_TAB_BAR_CLEARANCE = 96;

export default function PlanScheduleScreen() {
  const router = useRouter();
  const { routeId, planId } = useLocalSearchParams<{ routeId: string; planId: string }>();
  const apiOrigin = useMemo(getApiOrigin, []);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlanDetail | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!planId) {
        setErrorMessage('planId가 필요합니다.');
        setIsLoading(false);
        return;
      }
      setErrorMessage(null);
      setIsLoading(true);
      try {
        const accessToken = await getStoredAccessToken();
        if (!accessToken) {
          if (isMounted) setIsLoading(false);
          router.replace('/login');
          return;
        }
        if (!apiOrigin) throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');

        const data = await fetchPlanDetail(apiOrigin, accessToken, planId);
        if (!isMounted) return;
        setDetail(data);
      } catch (error: unknown) {
        if (!isMounted) return;
        setDetail(null);
        setErrorMessage(error instanceof Error ? error.message : '플랜을 불러오지 못했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiOrigin, planId, router, retryNonce]);

  const handleRetry = () => {
    setRetryNonce((n) => n + 1);
  };

  const routerPushStage = (dayNumber: number) => {
    router.push({
      pathname: '/routes/[routeId]/plans/[planId]/stages/[dayNumber]',
      params: {
        routeId: routeId ?? '',
        planId: planId ?? '',
        dayNumber: String(dayNumber),
      },
    });
  };

  const stages = detail?.stages ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic">
          <ThemedText type="subtitle">일정</ThemedText>

          {isLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator accessibilityLabel="일정 불러오는 중" />
              <ThemedText type="small" themeColor="textSecondary">
                플랜 정보를 불러오는 중…
              </ThemedText>
            </View>
          ) : errorMessage ? (
            <View style={styles.placeholderBlock}>
              <ThemedText type="small" style={styles.errorText}>
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다시 시도"
                style={({ pressed }) => [styles.retryButton, pressed && styles.cardPressed]}
                onPress={handleRetry}>
                <ThemedText type="smallBold">다시 시도</ThemedText>
              </Pressable>
            </View>
          ) : stages.length === 0 ? (
            <View style={styles.placeholderBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                등록된 스테이지가 없습니다.
              </ThemedText>
            </View>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {detail?.plan.name ?? ''} · 스테이지 {stages.length}개 (표시 형식은 다음 단계에서 다듬습니다)
              </ThemedText>

              {stages.map((stage, index) => {
                const dayNumber = index + 1;
                const title = stage.title?.trim() || `Day ${dayNumber}`;
                return (
                  <Pressable
                    key={stage.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${title} 스테이지 상세`}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                    onPress={() => routerPushStage(dayNumber)}>
                    <ThemedText type="smallBold">{title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      거리·획득고도 카드는 다음 단계에서 표시됩니다.
                    </ThemedText>
                  </Pressable>
                );
              })}
            </>
          )}
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
    paddingBottom: Spacing.four + FLOATING_TAB_BAR_CLEARANCE,
    gap: Spacing.two,
  },
  loadingBlock: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'flex-start',
  },
  placeholderBlock: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderColor: '#A0A4AE',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  cardPressed: {
    opacity: 0.75,
  },
  errorText: {
    color: '#D64545',
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A0A4AE',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
