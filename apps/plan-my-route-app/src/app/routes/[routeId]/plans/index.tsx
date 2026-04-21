import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/icon';
import { HeaderBack } from '@/components/ui/header-back';
import { ListRefreshControl } from '@/components/ui/list-refresh-control';
import { PressableHaptic } from '@/components/ui/pressable-haptic';
import { MaxContentWidth, Radius, STAGE_STROKE_COLORS, Spacing } from '@/constants/theme';
import { formatPlanMetaDate } from '@/features/plan-my-route/format-plan-meta-date';
import { useRouteDetailQuery } from '@/features/plan-my-route/route-detail-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

function HeaderBackToHome() {
	const router = useRouter();

	const handlePress = () => {
		if (router.canGoBack()) router.back();
		else router.replace('/(tabs)');
	};

	return <HeaderBack label="Home" onPress={handlePress} />;
}

export default function RoutePlansScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const colorScheme = useColorScheme();
	const insets = useSafeAreaInsets();
	const { routeId: routeIdParam } = useLocalSearchParams<{ routeId: string | string[] }>();
	const normalizedRouteId = useMemo(() => {
		const r = routeIdParam;
		if (typeof r === 'string' && r.length > 0) return r;
		if (Array.isArray(r) && typeof r[0] === 'string' && r[0].length > 0) return r[0];
		return undefined;
	}, [routeIdParam]);

	const { data, error, isPending, isRefetching, refetch } = useRouteDetailQuery(normalizedRouteId);

	const routeName = data?.name ?? '';
	const plans = data?.plans ?? [];

	useLayoutEffect(() => {
		navigation.setOptions({
			title: '플랜',
			headerLeft: () => <HeaderBackToHome />,
		});
	}, [navigation, theme.tint]);

	useEffect(() => {
		if (error?.message === 'UNAUTHENTICATED') {
			router.replace('/login');
		}
	}, [error, router]);

	const errorMessage = !normalizedRouteId
		? 'routeId가 필요합니다.'
		: error && error.message !== 'UNAUTHENTICATED' && !data
			? error.message
			: null;

	const showLoading = Boolean(normalizedRouteId) && isPending && !data;

	const scrollBottomPad = Math.max(insets.bottom, Spacing.four);

	return (
		<ThemedView style={styles.container}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					normalizedRouteId ? (
						<ListRefreshControl
							refreshing={isRefetching}
							onRefresh={() => void refetch()}
						/>
					) : undefined
				}>
				{!showLoading ? (
					<View style={styles.routeContext}>
						{routeName.trim() ? (
							<ThemedText selectable style={styles.routeContextTitle} themeColor="text">
								{routeName.trim()}
							</ThemedText>
						) : null}
						<ThemedText selectable type="small" themeColor="textSecondary">
							라우트의 플랜을 선택하세요.
						</ThemedText>
					</View>
				) : null}

				{showLoading ? (
					<View style={styles.stateRow}>
						<ActivityIndicator color={theme.tint} />
						<ThemedText type="small" themeColor="textSecondary">
							불러오는 중…
						</ThemedText>
					</View>
				) : errorMessage ? null : plans.length === 0 ? (
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
							const meta = formatPlanMetaDate(plan.start_date, plan.created_at);
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
													params: { routeId: normalizedRouteId ?? '', planId: plan.id },
												})
											}>
											<View
												style={[
													styles.planCardInner,
													{
														backgroundColor: theme.surfaceElevated,
														boxShadow:
															colorScheme === 'dark'
																? '0px 1px 8px rgba(0, 0, 0, 0.35)'
																: '0px 1px 3px rgba(0, 0, 0, 0.08)',
													},
												]}>
												<View style={styles.cardText}>
													<ThemedText selectable type="smallBold">
														{plan.name}
													</ThemedText>
													{meta ? (
														<ThemedText
															selectable
															type="caption"
															themeColor="textSecondary"
															style={styles.metaDate}>
															{meta}
														</ThemedText>
													) : null}
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
					<ThemedText selectable type="small" style={{ color: theme.danger }}>
						{errorMessage}
					</ThemedText>
				) : null}
			</ScrollView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
	},
	scroll: {
		flex: 1,
		width: '100%',
		maxWidth: MaxContentWidth,
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.three,
		gap: Spacing.three,
		flexGrow: 1,
	},
	routeContext: {
		gap: Spacing.two,
	},
	routeContextTitle: {
		fontSize: 22,
		lineHeight: 30,
		fontWeight: '600',
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
	metaDate: {
		fontVariant: ['tabular-nums'],
	},
});
