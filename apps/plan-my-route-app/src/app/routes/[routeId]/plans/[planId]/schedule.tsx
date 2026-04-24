import { stageDayLabel } from "@my-ridings/plan-geometry";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
	ActionSheetIOS,
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { ListItemCard } from "@/components/ui/list-item-card";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import type { MobilePlanStageRow } from "@/features/api/plan-my-route";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import {
	buildStageCardSummary,
	type StageCardSummary,
	usePlanStageForecastsQuery,
} from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

/** 플로팅 pill·탭바와 겹치지 않도록 하단 여백 */
const FLOATING_TAB_BAR_CLEARANCE = 96;

const formatTempLabel = (s: StageCardSummary): string | null => {
	const a = s.tempMin;
	const b = s.tempMax;
	if (a == null && b == null) return null;
	if (a != null && b != null) {
		if (Math.abs(a - b) < 0.5) return `${a.toFixed(0)}°`;
		return `${a.toFixed(0)}~${b.toFixed(0)}°`;
	}
	if (a != null) return `${a.toFixed(0)}°`;
	return b != null ? `${b.toFixed(0)}°` : null;
};

export default function PlanScheduleScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { routeId, planId } = useLocalSearchParams<{ routeId: string; planId: string }>();

	const { data: detail, error, isPending, isRefetching, refetch } = usePlanDetailQuery(planId);

	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED") {
			router.replace("/login");
		}
	}, [error, router]);

	const errorMessage = !planId
		? "planId가 필요합니다."
		: error && error.message !== "UNAUTHENTICATED" && !detail
			? error.message
			: null;

	const showLoading = Boolean(planId) && isPending && !detail;

	const handleRetry = () => {
		void refetch();
	};

	const routerPushStage = (dayNumber: number) => {
		router.push({
			pathname: "/routes/[routeId]/plans/[planId]/stages/[dayNumber]",
			params: {
				routeId: routeId ?? "",
				planId: planId ?? "",
				dayNumber: String(dayNumber),
			},
		});
	};

	const routerPushStageWeather = (dayNumber: number) => {
		router.push({
			pathname: "/routes/[routeId]/plans/[planId]/stages/[dayNumber]/weather",
			params: {
				routeId: routeId ?? "",
				planId: planId ?? "",
				dayNumber: String(dayNumber),
			},
		});
	};

	const routerPushStageEdit = (dayNumber: number) => {
		router.push({
			pathname: "/routes/[routeId]/plans/[planId]/stages/[dayNumber]/edit",
			params: {
				routeId: routeId ?? "",
				planId: planId ?? "",
				dayNumber: String(dayNumber),
			},
		});
	};

	const openStageOverflowMenu = (dayNumber: number, headlineShort: string) => {
		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ["취소", "스테이지 편집"],
					cancelButtonIndex: 0,
					title: headlineShort,
				},
				(buttonIndex) => {
					if (buttonIndex === 1) routerPushStageEdit(dayNumber);
				},
			);
		} else {
			Alert.alert(headlineShort, undefined, [
				{ text: "취소", style: "cancel" },
				{
					text: "스테이지 편집",
					onPress: () => routerPushStageEdit(dayNumber),
				},
			]);
		}
	};

	const stages = detail?.stages ?? [];
	const stageForecasts = usePlanStageForecastsQuery(planId, stages.length);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic"
					refreshControl={
						planId ? (
							<ListRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
						) : undefined
					}
				>
					{detail?.plan.name ? (
						<ThemedText selectable style={styles.planName}>
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
								onPress={handleRetry}
							>
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
								const stageLabel = `Stage ${dayNumber}`;
								const a11yHeadline = datePart ? `${stageLabel}, ${datePart}` : stageLabel;
								const distanceKm = stageDistanceKm(stage);
								const gainM = Math.round(Number(stage.elevation_gain) || 0);
								const effectiveKm = calcEffectiveDistanceKm(distanceKm, gainM);
								const startName = stage.start_name?.trim();
								const endName = stage.end_name?.trim();
								const routeDesc =
									startName && endName
										? `${startName} → ${endName}`
										: (startName ?? endName ?? null);
								const a11yLabel = `${a11yHeadline}, ${distanceKm.toFixed(1)} km, 획득고도 ${gainM} m`;
								const fr = stageForecasts[index];
								const forecastLoading = fr?.isPending ?? false;
								const forecastFailed = fr?.isError ?? false;
								const cardSummary = buildStageCardSummary(fr?.data);

								return (
									<Animated.View
										key={stage.id}
										entering={FadeInDown.delay(index * 50).duration(320)}
									>
										<ListItemCard layout="row">
											<PressableHaptic
												accessibilityRole="button"
												accessibilityLabel={`${a11yLabel}, 스테이지 상세`}
												style={styles.cardPressable}
												onPress={() => routerPushStage(dayNumber)}
											>
												<View style={styles.cardContent}>
													<View style={styles.cardTopRow}>
														<ThemedText type="smallBold" style={styles.stageLabel}>
															{stageLabel}
														</ThemedText>
														{datePart ? (
															<ThemedText
																type="caption"
																themeColor="textSecondary"
																style={styles.dateLabel}
															>
																{datePart}
															</ThemedText>
														) : null}
													</View>
													{routeDesc ? (
														<ThemedText
															type="caption"
															themeColor="textSecondary"
															numberOfLines={1}
															selectable
														>
															{routeDesc}
														</ThemedText>
													) : null}
													<View style={styles.metricsRow}>
														<View style={styles.metricCell}>
															<AppIcon
																name="figure.outdoor.cycle"
																size={14}
																tintColor={theme.tint}
															/>
															<ThemedText type="small" style={styles.metricValue}>
																{distanceKm.toFixed(1)}
															</ThemedText>
															<ThemedText type="caption" themeColor="textSecondary">
																{" km"}
															</ThemedText>
														</View>
														<View style={styles.metricCell}>
															<AppIcon name="arrow.up.forward" size={14} tintColor={theme.gain} />
															<ThemedText
																type="small"
																style={[styles.metricValue, { color: theme.gain }]}
															>
																+{gainM.toLocaleString()}
															</ThemedText>
															<ThemedText type="caption" themeColor="textSecondary">
																{" m"}
															</ThemedText>
														</View>
														<View style={styles.metricSpacer} />
														<ThemedText
															type="caption"
															themeColor="textSecondary"
															style={styles.effectiveKm}
														>
															≈ {effectiveKm.toFixed(1)} km
														</ThemedText>
													</View>
													<PressableHaptic
														accessibilityRole="button"
														accessibilityLabel={`${a11yHeadline}, 날씨 브리핑`}
														style={styles.forecastRow}
														onPress={() => routerPushStageWeather(dayNumber)}
													>
														{forecastLoading ? (
															<>
																<AppIcon
																	name="cloud.sun"
																	size={14}
																	tintColor={theme.textSecondary}
																/>
																<ActivityIndicator
																	accessibilityLabel="스테이지 날씨 불러오는 중"
																	color={theme.tint}
																	style={styles.forecastSpinner}
																/>
															</>
														) : forecastFailed ? (
															<>
																<AppIcon
																	name="exclamationmark.triangle"
																	size={14}
																	tintColor={theme.textSecondary}
																/>
																<ThemedText type="caption" themeColor="textSecondary">
																	날씨를 불러오지 못했습니다
																</ThemedText>
															</>
														) : cardSummary?.hasData ? (
															<>
																<AppIcon
																	name={cardSummary.iconName}
																	size={14}
																	tintColor={theme.tint}
																/>
																{formatTempLabel(cardSummary) != null && (
																	<ForecastChip
																		icon="thermometer.medium"
																		value={formatTempLabel(cardSummary) ?? "—"}
																	/>
																)}
																{cardSummary.popMax != null && (
																	<ForecastChip icon="drop.fill" value={`${cardSummary.popMax}%`} />
																)}
																{cardSummary.showWind &&
																	cardSummary.windMin != null &&
																	cardSummary.windMax != null && (
																		<ForecastChip
																			icon="wind"
																			value={
																				cardSummary.windMin === cardSummary.windMax
																					? `${cardSummary.windMin.toFixed(1)}m/s`
																					: `${cardSummary.windMin.toFixed(1)}~${cardSummary.windMax.toFixed(1)}m/s`
																			}
																		/>
																	)}
																<View style={styles.forecastChevron}>
																	<AppIcon
																		name="chevron.right"
																		size={10}
																		tintColor={theme.textSecondary}
																	/>
																</View>
															</>
														) : (
															<>
																<AppIcon
																	name="cloud.sun"
																	size={14}
																	tintColor={theme.textSecondary}
																/>
																<ThemedText type="caption" themeColor="textSecondary">
																	예보 데이터 없음
																</ThemedText>
															</>
														)}
													</PressableHaptic>
												</View>
											</PressableHaptic>
											<Pressable
												accessibilityRole="button"
												accessibilityLabel={`${a11yHeadline}, 더보기 메뉴`}
												hitSlop={8}
												style={styles.moreButton}
												onPress={() => openStageOverflowMenu(dayNumber, stageLabel)}
											>
												<AppIcon name="ellipsis" size={16} tintColor={theme.textSecondary} />
											</Pressable>
										</ListItemCard>
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
		flexDirection: "row",
		justifyContent: "center",
	},
	safeArea: {
		flex: 1,
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.two,
		paddingBottom: Spacing.four + FLOATING_TAB_BAR_CLEARANCE,
		gap: Spacing.three,
	},
	planName: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "600",
	},
	stateBlock: {
		gap: Spacing.two,
		paddingVertical: Spacing.three,
		alignItems: "flex-start",
	},
	stateBlockCenter: {
		gap: Spacing.three,
		paddingVertical: Spacing.five,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButton: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.two,
		borderRadius: Radius.md,
	},
	cardList: {
		gap: Spacing.two,
	},
	cardPressable: {
		flex: 1,
		minWidth: 0,
	},
	cardContent: {
		paddingLeft: Spacing.three,
		paddingRight: Spacing.one,
		paddingVertical: 12,
		gap: 6,
	},
	cardTopRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	stageLabel: {
		flexShrink: 0,
	},
	dateLabel: {
		flex: 1,
	},
	metricsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		marginTop: 2,
	},
	metricCell: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	metricSpacer: {
		flex: 1,
	},
	metricValue: {
		fontVariant: ["tabular-nums"],
	},
	effectiveKm: {
		fontVariant: ["tabular-nums"],
	},
	forecastRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 4,
	},
	forecastSpinner: {
		transform: [{ scale: 0.85 }],
	},
	forecastText: {
		flex: 1,
		minWidth: 0,
	},
	forecastChevron: {
		marginLeft: "auto",
	},
	forecastChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
	moreButton: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
		marginTop: Spacing.one,
		flexShrink: 0,
	},
});

function stageDistanceKm(stage: MobilePlanStageRow): number {
	const startM = stage.start_distance ?? 0;
	const endM = stage.end_distance ?? startM;
	return (endM - startM) / 1000;
}

/** 환산 거리: 거리(km) + 획득고도(m) / 100 × 1.2 */
function calcEffectiveDistanceKm(distanceKm: number, gainM: number): number {
	return Math.round((distanceKm + (gainM / 100) * 1.2) * 10) / 10;
}

type ForecastChipProps = {
	icon: string;
	value: string;
};

function ForecastChip({ icon, value }: ForecastChipProps) {
	const theme = useTheme();
	return (
		<View style={styles.forecastChip}>
			<AppIcon name={icon} size={12} tintColor={theme.textSecondary} />
			<ThemedText
				type="caption"
				themeColor="textSecondary"
				style={{ fontVariant: ["tabular-nums"] }}
			>
				{value}
			</ThemedText>
		</View>
	);
}
