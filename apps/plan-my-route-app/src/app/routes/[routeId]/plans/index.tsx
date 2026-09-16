import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Snackbar } from "@/components/snackbar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { HeaderBack } from "@/components/ui/header-back";
import { AppIcon } from "@/components/ui/icon";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { MaxContentWidth, Radius, Shadow, Spacing } from "@/constants/theme";
import type { RouteDetail } from "@/features/api/plan-my-route";
import { PlanComparisonCard } from "@/features/plan-my-route/components/plan-comparison-card";
import { moveItem } from "@/features/plan-my-route/plan-order";
import {
	routeDetailQueryKey,
	updateRoutePlanOrder,
	updateRouteSelectedPlan,
	useRouteDetailQuery,
} from "@/features/plan-my-route/route-detail-query";
import { useTheme } from "@/hooks/use-theme";

function HeaderBackToHome() {
	const router = useRouter();

	const handlePress = () => {
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	};

	return <HeaderBack onPress={handlePress} accessibilityLabel="홈으로 돌아가기" />;
}

export default function RoutePlansScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const [isEditingOrder, setIsEditingOrder] = useState(false);
	const [isSavingOrder, setIsSavingOrder] = useState(false);
	const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
	const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
	const { routeId: routeIdParam } = useLocalSearchParams<{ routeId: string | string[] }>();
	const normalizedRouteId = useMemo(() => {
		const r = routeIdParam;
		if (typeof r === "string" && r.length > 0) return r;
		if (Array.isArray(r) && typeof r[0] === "string" && r[0].length > 0) return r[0];
		return undefined;
	}, [routeIdParam]);

	const { data, error, isPending, isRefetching, refetch } = useRouteDetailQuery(normalizedRouteId);

	const routeName = data?.name ?? "";
	const plans = data?.plans ?? [];

	useLayoutEffect(() => {
		navigation.setOptions({
			title: "플랜",
			headerLeft: () => <HeaderBackToHome />,
			headerRight: () =>
				plans.length > 1 ? (
					<HeaderButton
						accessibilityLabel={isEditingOrder ? "순서 편집 완료" : "플랜 순서 편집"}
						disabled={isSavingOrder}
						onPress={() => setIsEditingOrder((current) => !current)}
					>
						<ThemedText type="small" style={{ color: theme.tint, fontWeight: "600" }}>
							{isEditingOrder ? "완료" : "순서 편집"}
						</ThemedText>
					</HeaderButton>
				) : null,
		});
	}, [isEditingOrder, isSavingOrder, navigation, plans.length, theme.tint]);

	const movePlan = useCallback(
		async (fromIndex: number, toIndex: number) => {
			if (!normalizedRouteId || isSavingOrder) return;
			const previous = queryClient.getQueryData<RouteDetail>(
				routeDetailQueryKey(normalizedRouteId),
			);
			if (!previous) return;
			const nextPlans = moveItem(previous.plans, fromIndex, toIndex).map((plan, index) => ({
				...plan,
				sort_order: index,
			}));
			if (nextPlans.every((plan, index) => plan.id === previous.plans[index]?.id)) return;

			queryClient.setQueryData<RouteDetail>(routeDetailQueryKey(normalizedRouteId), {
				...previous,
				plans: nextPlans,
			});
			setIsSavingOrder(true);
			try {
				await updateRoutePlanOrder(
					normalizedRouteId,
					nextPlans.map((plan) => plan.id),
				);
				setSnackbarMessage("플랜 우선순위를 저장했습니다.");
			} catch (moveError) {
				queryClient.setQueryData(routeDetailQueryKey(normalizedRouteId), previous);
				setSnackbarMessage(
					moveError instanceof Error ? moveError.message : "플랜 순서를 저장하지 못했습니다.",
				);
			} finally {
				setIsSavingOrder(false);
			}
		},
		[isSavingOrder, normalizedRouteId, queryClient],
	);

	const selectRidePlan = useCallback(
		async (planId: string) => {
			if (!normalizedRouteId || selectingPlanId) return;
			const previous = queryClient.getQueryData<RouteDetail>(
				routeDetailQueryKey(normalizedRouteId),
			);
			if (!previous || previous.selected_plan_id === planId) return;

			queryClient.setQueryData<RouteDetail>(routeDetailQueryKey(normalizedRouteId), {
				...previous,
				selected_plan_id: planId,
			});
			setSelectingPlanId(planId);
			try {
				await updateRouteSelectedPlan(normalizedRouteId, planId);
				setSnackbarMessage("라이딩 플랜으로 선택했습니다.");
			} catch (selectionError) {
				queryClient.setQueryData(routeDetailQueryKey(normalizedRouteId), previous);
				setSnackbarMessage(
					selectionError instanceof Error
						? selectionError.message
						: "라이딩 플랜을 선택하지 못했습니다.",
				);
			} finally {
				setSelectingPlanId(null);
			}
		},
		[normalizedRouteId, queryClient, selectingPlanId],
	);

	const requestRidePlanSelection = useCallback(
		(planId: string, planName: string) => {
			if (data?.selected_plan_id && data.selected_plan_id !== planId) {
				Alert.alert("라이딩 플랜 변경", `현재 선택을 “${planName}” 플랜으로 변경할까요?`, [
					{ text: "취소", style: "cancel" },
					{ text: "변경", onPress: () => void selectRidePlan(planId) },
				]);
				return;
			}
			void selectRidePlan(planId);
		},
		[data?.selected_plan_id, selectRidePlan],
	);

	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED") {
			router.replace("/login");
		}
	}, [error, router]);

	const errorMessage = !normalizedRouteId
		? "routeId가 필요합니다."
		: error && error.message !== "UNAUTHENTICATED" && !data
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
						<ListRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
					) : undefined
				}
			>
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
							return (
								<Animated.View key={plan.id} entering={FadeInDown.delay(index * 40).duration(280)}>
									<PlanComparisonCard
										plan={plan}
										rank={index + 1}
										isEditingOrder={isEditingOrder}
										canMoveUp={index > 0}
										canMoveDown={index < plans.length - 1}
										reorderDisabled={isSavingOrder}
										isRidePlan={data?.selected_plan_id === plan.id}
										isSelectingRidePlan={selectingPlanId !== null}
										onSelectRidePlan={() => requestRidePlanSelection(plan.id, plan.name)}
										onMoveUp={() => void movePlan(index, index - 1)}
										onMoveDown={() => void movePlan(index, index + 1)}
										onEditReviewNote={() =>
											router.push({
												pathname: "/routes/[routeId]/plans/[planId]/note",
												params: { routeId: normalizedRouteId ?? "", planId: plan.id },
											})
										}
										onPress={() =>
											router.push({
												pathname: "/routes/[routeId]/plans/[planId]/schedule",
												params: { routeId: normalizedRouteId ?? "", planId: plan.id },
											})
										}
									/>
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
			{isSavingOrder ? (
				<View
					accessibilityLabel="플랜 순서 저장 중"
					accessibilityViewIsModal
					style={[StyleSheet.absoluteFill, styles.savingOverlay]}
				>
					<View
						style={[
							styles.savingIndicator,
							{ backgroundColor: theme.surfaceElevated, boxShadow: Shadow.floatingDark },
						]}
					>
						<ActivityIndicator color={theme.tint} />
						<ThemedText type="smallBold">순서 저장 중…</ThemedText>
					</View>
				</View>
			) : null}
			<Snackbar message={snackbarMessage} onDismiss={() => setSnackbarMessage(null)} />
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "center",
	},
	scroll: {
		flex: 1,
		width: "100%",
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
		fontWeight: "600",
	},
	stateRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	empty: {
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.five,
	},
	list: {
		gap: Spacing.three,
	},
	savingOverlay: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(0, 0, 0, 0.28)",
		zIndex: 10,
	},
	savingIndicator: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.three,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
	},
});
