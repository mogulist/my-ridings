import { stageDayLabel } from "@my-ridings/plan-geometry";
import type { StageMidPoint, StageShortPoint } from "@my-ridings/weather-types";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import {
	POINT_ROLES,
	StageWeatherMidPointCard,
} from "@/features/plan-my-route/components/stage-weather-mid-point-card";
import { StageWeatherShortPointCard } from "@/features/plan-my-route/components/stage-weather-short-point-card";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import { usePlanStageForecastQuery } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

type Row = { kind: "point"; data: StageMidPoint | StageShortPoint };

export default function StageWeatherScreen() {
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
		({ item, index }) => {
			if (item.kind !== "point" || !data) return null;
			const role = POINT_ROLES[index] ?? `지점 ${index + 1}`;
			if (data.mode === "mid") {
				return <StageWeatherMidPointCard point={item.data as StageMidPoint} role={role} />;
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
						contentContainerStyle={styles.listContent}
						contentInsetAdjustmentBehavior="automatic"
						ListHeaderComponent={
							<View style={styles.headerBlock}>
								{datePart ? (
									<ThemedText type="caption" themeColor="textSecondary" style={styles.dateText}>
										{datePart}
									</ThemedText>
								) : null}
								<ThemedText type="smallBold" style={styles.stageTitle} numberOfLines={2}>
									{stageTitle}
								</ThemedText>
								{data && (
									<ThemedText type="caption" themeColor="textSecondary" style={styles.modeHint}>
										{data.mode === "mid" ? "중기 예보 (오전/오후·최저·최고)" : "단기 예보 (시간별)"}
									</ThemedText>
								)}
								{data?.mode === "short" && (
									<ThemedText type="caption" themeColor="textSecondary" style={styles.hintDetail}>
										가로로 스크롤하여 시간대를 확인하세요. 요청 시 앵커에 가깝게 맞춥니다.
									</ThemedText>
								)}
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
	listContent: {
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.three,
		paddingBottom: Spacing.six,
	},
	headerBlock: { marginBottom: Spacing.three, gap: Spacing.one },
	dateText: { marginBottom: 2 },
	stageTitle: { marginBottom: 2 },
	modeHint: { fontWeight: "500" },
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
