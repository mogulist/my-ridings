import { stageDayLabel } from "@my-ridings/plan-geometry";
import type { StageMidPoint, StageShortPoint } from "@my-ridings/weather-types";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { StageWeatherMidPointCard } from "@/features/plan-my-route/components/stage-weather-mid-point-card";
import { StageWeatherShortPointCard } from "@/features/plan-my-route/components/stage-weather-short-point-card";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import { usePlanStageForecastQuery } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

type Row = { kind: "point"; data: StageMidPoint | StageShortPoint };

export default function StageWeatherScreen() {
	const navigation = useNavigation();
	const theme = useTheme();
	const { planId, dayNumber: dayNumberParam } = useLocalSearchParams<{
		planId: string;
		dayNumber: string;
	}>();

	const dayNumber = Number.parseInt(dayNumberParam ?? "1", 10);
	const validDayNumber = Number.isFinite(dayNumber) && dayNumber >= 1 ? dayNumber : 1;

	const { data: detail } = usePlanDetailQuery(planId);
	const { data, isPending, isError, isRefetching, refetch } = usePlanStageForecastQuery(
		planId,
		validDayNumber,
	);

	useEffect(() => {
		if (isError) {
			// handled inline
		}
	}, [isError]);

	const datePart = stageDayLabel(validDayNumber, detail?.plan.start_date ?? null);
	const navTitle = useMemo(
		() => stageWeatherNavTitle(validDayNumber, datePart),
		[validDayNumber, datePart],
	);

	useLayoutEffect(() => {
		navigation.setOptions({ title: navTitle });
	}, [navigation, navTitle]);

	const stage = detail?.stages?.[validDayNumber - 1];
	const stageTitle =
		stage?.start_name && stage?.end_name
			? `${stage.start_name} → ${stage.end_name}`
			: `스테이지 ${validDayNumber}`;

	const onRefresh = useCallback(() => {
		void refetch();
	}, [refetch]);

	const rows: Row[] =
		!data || !data.points.length
			? []
			: data.points.map((p) => ({ kind: "point" as const, data: p }));

	const keyExtractor = useCallback((item: Row) => `p-${item.data.index}`, []);

	const renderItem: ListRenderItem<Row> = useCallback(
		({ item }) => {
			if (item.kind !== "point" || !data) return null;
			if (data.mode === "mid") {
				return <StageWeatherMidPointCard point={item.data as StageMidPoint} />;
			}
			return <StageWeatherShortPointCard point={item.data as StageShortPoint} />;
		},
		[data],
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
				{isPending ? (
					<View style={styles.stateBlock}>
						<ActivityIndicator accessibilityLabel="날씨 불러오는 중" color={theme.tint} />
						<ThemedText type="small" themeColor="textSecondary">
							날씨 정보를 불러오는 중…
						</ThemedText>
					</View>
				) : isError ? (
					<View style={styles.stateBlock}>
						<AppIcon name="exclamationmark.triangle" size={36} tintColor={theme.warning} />
						<ThemedText type="small" themeColor="textSecondary">
							날씨 정보를 불러오지 못했습니다.
						</ThemedText>
						<PressableHaptic
							accessibilityRole="button"
							accessibilityLabel="다시 시도"
							style={[styles.retryButton, { backgroundColor: `${theme.tint}22` }]}
							onPress={() => void refetch()}
						>
							<ThemedText type="smallBold" themeColor="tint">
								다시 시도
							</ThemedText>
						</PressableHaptic>
					</View>
				) : !data?.points?.length ? (
					<View style={styles.stateBlock}>
						<AppIcon name="cloud" size={36} tintColor={theme.textSecondary} />
						<ThemedText type="small" themeColor="textSecondary">
							예보 데이터가 없습니다.{"\n"}잠시 후 다시 확인해 주세요.
						</ThemedText>
					</View>
				) : (
					<FlatList<Row>
						data={rows}
						keyExtractor={keyExtractor}
						renderItem={renderItem}
						style={styles.listRoot}
						contentContainerStyle={styles.listContent}
						contentInsetAdjustmentBehavior="automatic"
						ListHeaderComponent={
							<View style={styles.headerBlock}>
								<ThemedText type="smallBold" style={styles.stageTitle} numberOfLines={2}>
									{stageTitle}
								</ThemedText>
								{data ? (
									<View style={styles.modeRow}>
										<ThemedText type="smallBold">
											{data.mode === "mid" ? "중기 예보" : "단기 예보"}
										</ThemedText>
										{data.forecastBaseAt ? (
											<ThemedText
												type="caption"
												themeColor="textSecondary"
												style={styles.issuedAt}
												numberOfLines={2}
											>
												발표 {formatForecastIssuedKst(data.forecastBaseAt)}
											</ThemedText>
										) : (
											<ThemedText
												type="caption"
												themeColor="textSecondary"
												style={styles.issuedAt}
												numberOfLines={1}
											>
												발표 시각 없음
											</ThemedText>
										)}
									</View>
								) : null}
								{data && data.points.length > 0 ? (
									<ThemedText type="caption" themeColor="textSecondary" style={styles.hintDetail}>
										경로상 격자 {data.points.length}개
									</ThemedText>
								) : null}
							</View>
						}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						refreshControl={<ListRefreshControl onRefresh={onRefresh} refreshing={isRefetching} />}
					/>
				)}
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
	listRoot: {
		flex: 1,
		width: "100%",
	},
	listContent: {
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.two,
		paddingBottom: Spacing.six,
	},
	headerBlock: { marginBottom: Spacing.three, gap: Spacing.one },
	stageTitle: { marginBottom: 2 },
	modeRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.two,
	},
	issuedAt: { flexShrink: 1, textAlign: "right" },
	hintDetail: { lineHeight: 16 },
	separator: { height: Spacing.two },
	stateBlock: {
		alignItems: "center",
		gap: Spacing.three,
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.six,
	},
	retryButton: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.two,
		borderRadius: Radius.md,
	},
});

function stageWeatherNavTitle(dayNumber: number, datePart: string) {
	return datePart.trim() !== ""
		? `Stage ${dayNumber} · ${datePart} · 날씨`
		: `Stage ${dayNumber} · 날씨`;
}

const formatForecastIssuedKst = (iso: string) =>
	new Intl.DateTimeFormat("ko-KR", {
		timeZone: "Asia/Seoul",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(iso));
