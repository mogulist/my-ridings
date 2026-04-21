import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/icon';
import { PressableHaptic } from '@/components/ui/pressable-haptic';
import { MaxContentWidth, Radius, STAGE_STROKE_COLORS, Spacing } from '@/constants/theme';
import { fetchRouteDetail, type PlanItem } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function RoutePlansScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const colorScheme = useColorScheme();
	const { routeId } = useLocalSearchParams<{ routeId: string }>();
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [routeName, setRouteName] = useState('');
	const [plans, setPlans] = useState<PlanItem[]>([]);
	const apiOrigin = useMemo(getApiOrigin, []);

	const title = routeName.trim() ? routeName : '플랜';

	useLayoutEffect(() => {
		navigation.setOptions({
			title,
		});
	}, [navigation, title]);

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
			<SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic">
					<ThemedText type="small" themeColor="textSecondary">
						라우트의 플랜을 선택하세요.
					</ThemedText>

					{isLoading ? (
						<View style={styles.stateRow}>
							<ActivityIndicator color={theme.tint} />
							<ThemedText type="small" themeColor="textSecondary">
								불러오는 중…
							</ThemedText>
						</View>
					) : plans.length === 0 ? (
						<View style={styles.empty}>
							<AppIcon name="calendar" size={48} tintColor={theme.textSecondary} />
							<ThemedText type="small" themeColor="textSecondary">
								플랜이 없습니다.
							</ThemedText>
						</View>
					) : (
						<View style={styles.list}>
							{plans.map((plan, index) => {
								const accent = STAGE_STROKE_COLORS[index % STAGE_STROKE_COLORS.length];
								return (
									<Animated.View
										key={plan.id}
										entering={FadeInDown.delay(index * 40).duration(280)}>
										<View style={styles.planCardOuter}>
											<View style={[styles.accentBar, { backgroundColor: accent }]} />
											<PressableHaptic
												style={styles.cardPressable}
												onPress={() =>
													router.push({
														pathname: '/routes/[routeId]/plans/[planId]/schedule',
														params: { routeId: routeId ?? '', planId: plan.id },
													})
												}>
												<View
													style={[
														styles.planCardInner,
														{
															backgroundColor: theme.surfaceElevated,
															boxShadow:
																colorScheme === 'dark'
																	? '0px 2px 12px rgba(0, 0, 0, 0.45)'
																	: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 16px rgba(0, 0, 0, 0.06)',
														},
													]}>
													<View style={styles.cardText}>
														<ThemedText type="smallBold" numberOfLines={2}>
															{plan.name}
														</ThemedText>
														<ThemedText type="caption" themeColor="textSecondary">
															{plan.start_date ?? plan.created_at ?? ''}
														</ThemedText>
													</View>
													<AppIcon name="chevron.right" size={18} tintColor={theme.textSecondary} />
												</View>
											</PressableHaptic>
										</View>
									</Animated.View>
								);
							})}
						</View>
					)}

					{errorMessage ? (
						<ThemedText type="small" style={{ color: theme.danger }}>
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
		paddingVertical: Spacing.two,
		gap: Spacing.three,
	},
	stateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	empty: {
		alignItems: 'center',
		gap: Spacing.two,
		paddingVertical: Spacing.five,
	},
	list: {
		gap: Spacing.three,
	},
	planCardOuter: {
		flexDirection: 'row',
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
	planCardInner: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingLeft: Spacing.three,
		paddingRight: Spacing.two,
		paddingVertical: Spacing.three,
		borderTopRightRadius: Radius.lg,
		borderBottomRightRadius: Radius.lg,
		borderCurve: 'continuous',
		gap: Spacing.two,
	},
	cardText: {
		flex: 1,
		minWidth: 0,
		gap: Spacing.half,
	},
});
