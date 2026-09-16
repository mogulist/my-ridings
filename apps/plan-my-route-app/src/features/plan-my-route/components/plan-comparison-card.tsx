import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { ListItemCard } from "@/components/ui/list-item-card";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { Radius, Spacing } from "@/constants/theme";
import type { PlanItem } from "@/features/api/plan-my-route";
import { formatPlanMetaDate } from "@/features/plan-my-route/format-plan-meta-date";
import { buildPlanComparisonSummary } from "@/features/plan-my-route/plan-comparison";
import { useTheme } from "@/hooks/use-theme";

type PlanComparisonCardProps = {
	plan: PlanItem;
	rank: number;
	onPress: () => void;
};

export function PlanComparisonCard({ plan, rank, onPress }: PlanComparisonCardProps) {
	const theme = useTheme();
	const summary = buildPlanComparisonSummary(plan);
	const meta = formatPlanMetaDate(plan.start_date, plan.created_at);
	const accessibilitySummary = `${rank}순위, ${plan.name}, ${summary.dayCount}일, ${formatDistance(summary.totalDistanceKm)}, 획득고도 ${summary.totalElevationGainM.toLocaleString()}미터`;

	return (
		<ListItemCard>
			<PressableHaptic
				accessibilityLabel={`${accessibilitySummary}, 플랜 일정 열기`}
				style={styles.pressable}
				onPress={onPress}
			>
				<View style={styles.content}>
					<View style={styles.headerRow}>
						<View style={[styles.rankPill, { backgroundColor: `${theme.tint}18` }]}>
							<ThemedText type="caption" style={{ color: theme.tint, fontWeight: "700" }}>
								{rank}순위
							</ThemedText>
						</View>
						<View style={styles.titleBlock}>
							<ThemedText selectable type="smallBold" style={styles.title}>
								{plan.name}
							</ThemedText>
							{meta ? (
								<ThemedText selectable type="caption" themeColor="textSecondary">
									{meta}
								</ThemedText>
							) : null}
						</View>
						<AppIcon name="chevron.right" size={16} tintColor={theme.textSecondary} />
					</View>

					<View style={[styles.metrics, { borderColor: theme.separator }]}>
						<Metric icon="calendar" value={`${summary.dayCount}일`} />
						<Metric icon="figure.outdoor.cycle" value={formatDistance(summary.totalDistanceKm)} />
						<Metric icon="arrow.up.forward" value={`+${summary.totalElevationGainM.toLocaleString()}m`} tint={theme.gain} />
					</View>

					{summary.stages.length > 0 ? (
						<View style={styles.stageList}>
							{summary.stages.map((stage) => (
								<View key={stage.dayNumber} style={styles.stageRow}>
									<View style={[styles.dayBadge, { backgroundColor: theme.backgroundElement }]}>
										<ThemedText type="caption" style={styles.dayText}>
											D{stage.dayNumber}
										</ThemedText>
									</View>
									<ThemedText type="small" style={styles.stageDistance}>
										{formatDistance(stage.distanceKm)}
									</ThemedText>
									<ThemedText
										selectable
										type="small"
										themeColor={stage.endName ? "text" : "textSecondary"}
										style={styles.stageEnd}
										numberOfLines={1}
									>
										{stage.endName ?? "종료 지점 미정"}
									</ThemedText>
									<ThemedText type="caption" themeColor="textSecondary" style={styles.stageGain}>
										+{stage.elevationGainM.toLocaleString()}m
									</ThemedText>
								</View>
							))}
						</View>
					) : (
						<ThemedText type="caption" themeColor="textSecondary">
							등록된 스테이지가 없습니다.
						</ThemedText>
					)}
				</View>
			</PressableHaptic>
		</ListItemCard>
	);
}

function Metric({ icon, value, tint }: { icon: string; value: string; tint?: string }) {
	const theme = useTheme();
	return (
		<View style={styles.metric}>
			<AppIcon name={icon} size={13} tintColor={tint ?? theme.tint} />
			<ThemedText type="caption" style={[styles.metricValue, tint ? { color: tint } : null]}>
				{value}
			</ThemedText>
		</View>
	);
}

function formatDistance(distanceKm: number): string {
	return `${distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}km`;
}

const styles = StyleSheet.create({
	pressable: { flex: 1, minWidth: 0 },
	content: { gap: Spacing.three, padding: Spacing.three },
	headerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	rankPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
	titleBlock: { flex: 1, minWidth: 0, gap: Spacing.half },
	title: { fontSize: 16, lineHeight: 22 },
	metrics: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.three,
		paddingBottom: Spacing.three,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	metric: { flexDirection: "row", alignItems: "center", gap: Spacing.one },
	metricValue: { fontVariant: ["tabular-nums"], fontWeight: "600" },
	stageList: { gap: Spacing.two },
	stageRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two, minHeight: 26 },
	dayBadge: { minWidth: 30, paddingHorizontal: 6, paddingVertical: 3, borderRadius: Radius.sm },
	dayText: { textAlign: "center", fontWeight: "700", fontVariant: ["tabular-nums"] },
	stageDistance: { width: 66, fontVariant: ["tabular-nums"], fontWeight: "600" },
	stageEnd: { flex: 1, minWidth: 0 },
	stageGain: { fontVariant: ["tabular-nums"] },
});
