import { stageDayLabel } from '@my-ridings/plan-geometry';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/icon';
import { ListRefreshControl } from '@/components/ui/list-refresh-control';
import { PressableHaptic } from '@/components/ui/pressable-haptic';
import { MaxContentWidth, Radius, STAGE_STROKE_COLORS, Spacing } from '@/constants/theme';
import type { MobilePlanStageRow } from '@/features/api/plan-my-route';
import { usePlanDetailQuery } from '@/features/plan-my-route/plan-detail-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** 플로팅 pill·탭바와 겹치지 않도록 하단 여백 */
const FLOATING_TAB_BAR_CLEARANCE = 96;

export default function PlanScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { routeId, planId } = useLocalSearchParams<{ routeId: string; planId: string }>();

  const { data: detail, error, isPending, isRefetching, refetch } = usePlanDetailQuery(planId);

  useEffect(() => {
    if (error?.message === 'UNAUTHENTICATED') {
      router.replace('/login');
    }
  }, [error, router]);

  const errorMessage = !planId
    ? 'planId가 필요합니다.'
    : error && error.message !== 'UNAUTHENTICATED' && !detail
      ? error.message
      : null;

  const showLoading = Boolean(planId) && isPending && !detail;

  const handleRetry = () => {
    void refetch();
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

  const routerPushStageEdit = (dayNumber: number) => {
    router.push({
      pathname: '/routes/[routeId]/plans/[planId]/stages/[dayNumber]/edit',
      params: {
        routeId: routeId ?? '',
        planId: planId ?? '',
        dayNumber: String(dayNumber),
      },
    });
  };

  const openStageOverflowMenu = (dayNumber: number, headlineShort: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '스테이지 편집'],
          cancelButtonIndex: 0,
          title: headlineShort,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) routerPushStageEdit(dayNumber);
        },
      );
    } else {
      Alert.alert(headlineShort, undefined, [
        { text: '취소', style: 'cancel' },
        {
          text: '스테이지 편집',
          onPress: () => routerPushStageEdit(dayNumber),
        },
      ]);
    }
  };

  const stages = detail?.stages ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            planId ? (
              <ListRefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
              />
            ) : undefined
          }>
          {detail?.plan.name ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.planName}>
              {detail.plan.name}
            </ThemedText>
          ) : null}

          {showLoading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator accessibilityLabel="일정 불러오는 중" color={theme.tint} />
              <ThemedText type="small" themeColor="textSecondary">
                플랜 정보를 불러오는 중…
              </ThemedText>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateBlockCenter}>
              <AppIcon name="exclamationmark.triangle" size={40} tintColor={theme.warning} />
              <ThemedText type="small" style={{ color: theme.danger }} selectable>
                {errorMessage}
              </ThemedText>
              <PressableHaptic
                accessibilityRole="button"
                accessibilityLabel="다시 시도"
                style={[styles.primaryButton, { backgroundColor: `${theme.tint}22` }]}
                onPress={handleRetry}>
                <ThemedText type="smallBold" themeColor="tint">
                  다시 시도
                </ThemedText>
              </PressableHaptic>
            </View>
          ) : stages.length === 0 ? (
            <View style={styles.stateBlockCenter}>
              <AppIcon name="calendar" size={44} tintColor={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                등록된 스테이지가 없습니다.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.cardList}>
              {stages.map((stage, index) => {
                const dayNumber = index + 1;
                const datePart = stageDayLabel(dayNumber, detail?.plan.start_date ?? null);
                const headline = datePart ? `D${dayNumber} · ${datePart}` : `D${dayNumber}`;
                const distanceKm = stageDistanceKm(stage);
                const gainM = Math.round(Number(stage.elevation_gain) || 0);
                const titleExtra = stage.title?.trim();
                const a11yLabel = titleExtra
                  ? `${headline}, ${distanceKm.toFixed(1)} km, 획득고도 ${gainM} m, ${titleExtra}`
                  : `${headline}, ${distanceKm.toFixed(1)} km, 획득고도 ${gainM} m`;
                const accent = STAGE_STROKE_COLORS[(dayNumber - 1) % STAGE_STROKE_COLORS.length];

                return (
                  <Animated.View
                    key={stage.id}
                    entering={FadeInDown.delay(index * 50).duration(320)}>
                    <View style={styles.stageCardOuter}>
                      <View style={[styles.accentBar, { backgroundColor: accent }]} />
                      <PressableHaptic
                        accessibilityRole="button"
                        accessibilityLabel={`${a11yLabel}, 스테이지 상세`}
                        style={styles.cardPressable}
                        onPress={() => routerPushStage(dayNumber)}>
                        <View
                          style={[
                            styles.cardInner,
                            {
                              backgroundColor: theme.surfaceElevated,
                              boxShadow:
                                colorScheme === 'dark'
                                  ? '0px 2px 12px rgba(0, 0, 0, 0.45)'
                                  : '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 16px rgba(0, 0, 0, 0.06)',
                            },
                          ]}>
                          <View style={styles.cardTopRow}>
                            <ThemedText type="metric" style={styles.dayMetric}>
                              D{dayNumber}
                            </ThemedText>
                            {datePart ? (
                              <ThemedText type="headline" numberOfLines={1} style={styles.dateHeadline}>
                                {datePart}
                              </ThemedText>
                            ) : null}
                          </View>
                          <View style={styles.metricsRow}>
                            <View style={styles.metricCell}>
                              <AppIcon name="figure.outdoor.cycle" size={18} tintColor={theme.tint} />
                              <View style={styles.metricTextRow}>
                                <ThemedText type="metricSm" style={styles.metricValue}>
                                  {distanceKm.toFixed(1)}
                                </ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                  {' '}
                                  km
                                </ThemedText>
                              </View>
                            </View>
                            <View style={styles.metricCell}>
                              <AppIcon name="arrow.up.forward" size={18} tintColor={theme.gain} />
                              <View style={styles.metricTextRow}>
                                <ThemedText
                                  type="metricSm"
                                  style={[styles.metricValue, { color: theme.gain }]}>
                                  +{gainM.toLocaleString()}
                                </ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                  {' '}
                                  m
                                </ThemedText>
                              </View>
                            </View>
                          </View>
                          {titleExtra ? (
                            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                              {titleExtra}
                            </ThemedText>
                          ) : null}
                        </View>
                      </PressableHaptic>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${headline}, 더보기 메뉴`}
                        hitSlop={12}
                        style={styles.moreHit}
                        onPress={() => openStageOverflowMenu(dayNumber, headline)}>
                        <AppIcon name="ellipsis.circle" size={24} tintColor={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
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
    paddingVertical: Spacing.two,
    paddingBottom: Spacing.four + FLOATING_TAB_BAR_CLEARANCE,
    gap: Spacing.three,
  },
  planName: {
    marginBottom: Spacing.half,
  },
  stateBlock: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
  stateBlockCenter: {
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  cardList: {
    gap: Spacing.three,
  },
  stageCardOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'visible',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  cardPressable: {
    flex: 1,
    minWidth: 0,
  },
  cardInner: {
    flex: 1,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    borderCurve: 'continuous',
    gap: Spacing.two,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dayMetric: {
    flexShrink: 0,
  },
  dateHeadline: {
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metricCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: '40%',
  },
  metricTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
  },
  moreHit: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.two,
  },
});

function stageDistanceKm(stage: MobilePlanStageRow): number {
  const startM = stage.start_distance ?? 0;
  const endM = stage.end_distance ?? startM;
  return (endM - startM) / 1000;
}
