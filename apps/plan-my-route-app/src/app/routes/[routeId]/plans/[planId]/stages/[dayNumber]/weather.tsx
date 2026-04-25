import { stageDayLabel } from "@my-ridings/plan-geometry";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { formatStageKmRange } from "@/features/plan-my-route/components/stage-weather-briefing-format";
import { StageWeatherMidPointCard } from "@/features/plan-my-route/components/stage-weather-mid-point-card";
import { StageWeatherMidRepeatStrip } from "@/features/plan-my-route/components/stage-weather-mid-repeat-strip";
import { StageWeatherShortPointCard } from "@/features/plan-my-route/components/stage-weather-short-point-card";
import { StageWeatherShortRepeatStrip } from "@/features/plan-my-route/components/stage-weather-short-repeat-strip";
import { SyncedHorizontalScrollProvider } from "@/features/plan-my-route/components/synced-horizontal-scroll";
import {
	mergeMidPoints,
	midPointsAsSingletonGroups,
	type StageMidPointGroup,
} from "@/features/plan-my-route/merge-mid-points";
import {
	mergeShortPoints,
	shortPointsAsSingletonGroups,
	type StageShortPointGroup,
} from "@/features/plan-my-route/merge-short-points";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import { usePlanStageForecastQuery } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

type MidGroupRow = { kind: "mid-group"; data: StageMidPointGroup };
type MidRepeatRow = {
	kind: "mid-repeat";
	data: StageMidPointGroup;
	referenceKmRange: string | null;
};
type ShortGroupRow = { kind: "short-group"; data: StageShortPointGroup };
type ShortRepeatRow = {
	kind: "short-repeat";
	data: StageShortPointGroup;
	referenceKmRange: string | null;
};
type Row = MidGroupRow | MidRepeatRow | ShortGroupRow | ShortRepeatRow;

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
			: `Stage ${validDayNumber}`;

	const onRefresh = useCallback(() => {
		void refetch();
	}, [refetch]);

	const [showAllGridCards, setShowAllGridCards] = useState(false);

	useEffect(() => {
		setShowAllGridCards(false);
	}, [planId, validDayNumber, data?.mode]);

	const rows: Row[] = useMemo(() => {
		if (!data || !data.points.length) return [];
		if (showAllGridCards) {
			if (data.mode === "mid") {
				return midPointsAsSingletonGroups(data.points).map((g) => ({
					kind: "mid-group" as const,
					data: g,
				}));
			}
			return shortPointsAsSingletonGroups(data.points).map((g) => ({
				kind: "short-group" as const,
				data: g,
			}));
		}
		if (data.mode === "mid") {
			const groups = mergeMidPoints(data.points);
			const out: Row[] = [];
			for (const g of groups) {
				if (g.repeatOfKey == null) {
					out.push({ kind: "mid-group", data: g });
					continue;
				}
				const ref = groups.find((x) => x.key === g.repeatOfKey);
				out.push({
					kind: "mid-repeat",
					data: g,
					referenceKmRange: ref ? formatStageKmRange(ref.kmFrom, ref.kmTo) : null,
				});
			}
			return out;
		}
		const groups = mergeShortPoints(data.points);
		const out: Row[] = [];
		for (const g of groups) {
			if (g.repeatOfKey == null) {
				out.push({ kind: "short-group", data: g });
				continue;
			}
			const ref = groups.find((x) => x.key === g.repeatOfKey);
			out.push({
				kind: "short-repeat",
				data: g,
				referenceKmRange: ref ? formatStageKmRange(ref.kmFrom, ref.kmTo) : null,
			});
		}
		return out;
	}, [data, showAllGridCards]);

	const showGridExpandToggle = useMemo(() => {
		if (!data?.points.length) return false;
		if (data.mode === "mid") {
			const groups = mergeMidPoints(data.points);
			return (
				groups.length < data.points.length || groups.some((g) => g.repeatOfKey != null)
			);
		}
		const groups = mergeShortPoints(data.points);
		return groups.length < data.points.length || groups.some((g) => g.repeatOfKey != null);
	}, [data]);

	const keyExtractor = useCallback((item: Row) => {
		if (item.kind === "mid-group") return `mid-group-${item.data.key}`;
		if (item.kind === "mid-repeat") return `mid-repeat-${item.data.key}`;
		return `${item.kind}-${item.data.key}`;
	}, []);

	const renderItem: ListRenderItem<Row> = useCallback(({ item }) => {
		if (item.kind === "mid-group") {
			return <StageWeatherMidPointCard group={item.data} />;
		}
		if (item.kind === "mid-repeat") {
			return (
				<StageWeatherMidRepeatStrip group={item.data} referenceKmRange={item.referenceKmRange} />
			);
		}
		if (item.kind === "short-group") {
			return <StageWeatherShortPointCard group={item.data} />;
		}
		return (
			<StageWeatherShortRepeatStrip group={item.data} referenceKmRange={item.referenceKmRange} />
		);
	}, []);

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
					<SyncedHorizontalScrollProvider>
						<FlatList<Row>
							data={rows}
							extraData={showAllGridCards}
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
							refreshControl={
								<ListRefreshControl onRefresh={onRefresh} refreshing={isRefetching} />
							}
							ListFooterComponent={
								showGridExpandToggle ? (
									<View style={styles.footerToggleWrap}>
										<PressableHaptic
											accessibilityRole="button"
											accessibilityState={{ selected: showAllGridCards }}
											accessibilityLabel={
												showAllGridCards
													? "중복 제거된 격자 목록으로 보기"
													: "경로상 모든 격자 카드 펼치기"
											}
											style={[
												styles.footerToggleButton,
												{ backgroundColor: `${theme.tint}22`, borderColor: theme.separator },
											]}
											onPress={() => setShowAllGridCards((v) => !v)}
										>
											<ThemedText type="smallBold" themeColor="tint">
												{showAllGridCards ? "중복 제거 보기" : "모든 격자 카드 보기"}
											</ThemedText>
										</PressableHaptic>
									</View>
								) : null
							}
						/>
					</SyncedHorizontalScrollProvider>
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
	footerToggleWrap: {
		marginTop: Spacing.four,
		paddingTop: Spacing.two,
	},
	footerToggleButton: {
		alignSelf: "stretch",
		alignItems: "center",
		paddingVertical: Spacing.three,
		paddingHorizontal: Spacing.four,
		borderRadius: Radius.md,
		borderCurve: "continuous",
		borderWidth: StyleSheet.hairlineWidth,
	},
});

function stageWeatherNavTitle(dayNumber: number, datePart: string) {
	return datePart.trim() !== ""
		? `Stage ${dayNumber} · ${datePart} · Weather`
		: `Stage ${dayNumber} · Weather`;
}

const formatForecastIssuedKst = (iso: string) =>
	new Intl.DateTimeFormat("ko-KR", {
		timeZone: "Asia/Seoul",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(iso));
