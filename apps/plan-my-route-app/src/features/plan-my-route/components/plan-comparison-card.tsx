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
	isEditingOrder?: boolean;
	canMoveUp?: boolean;
	canMoveDown?: boolean;
	reorderDisabled?: boolean;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isRidePlan?: boolean;
	isSelectingRidePlan?: boolean;
	onSelectRidePlan?: () => void;
};

export function PlanComparisonCard({
	plan,
	rank,
	onPress,
	isEditingOrder = false,
	canMoveUp = false,
	canMoveDown = false,
	reorderDisabled = false,
	onMoveUp,
	onMoveDown,
	isRidePlan = false,
	isSelectingRidePlan = false,
	onSelectRidePlan,
}: PlanComparisonCardProps) {
	const theme = useTheme();
	const summary = buildPlanComparisonSummary(plan);
	const meta = formatPlanMetaDate(plan.start_date, plan.created_at);
	const accessibilitySummary = `${rank}순위, ${plan.name}, ${summary.dayCount}일, ${formatDistance(summary.totalDistanceKm)}, 획득고도 ${summary.totalElevationGainM.toLocaleString()}미터`;

	return (
		<ListItemCard>
			<PressableHaptic
				accessibilityLabel={`${accessibilitySummary}, 플랜 일정 열기`}
				style={styles.pressable}
				disabled={isEditingOrder}
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
						{isEditingOrder ? null : (
							<AppIcon name="chevron.right" size={16} tintColor={theme.textSecondary} />
						)}
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
									<ThemedText
										type="caption"
										style={styles.stageDistance}
										numberOfLines={1}
									>
										{formatDistance(stage.distanceKm)}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										style={styles.stageGain}
										numberOfLines={1}
									>
										+{stage.elevationGainM.toLocaleString()}m
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
			{isEditingOrder ? (
				<View style={[styles.reorderRow, { borderColor: theme.separator }]}>
					<ReorderButton
						label="우선순위 올리기"
						icon="arrow.up"
						disabled={!canMoveUp || reorderDisabled}
						onPress={onMoveUp}
					/>
					<View style={[styles.reorderDivider, { backgroundColor: theme.separator }]} />
					<ReorderButton
						label="우선순위 내리기"
						icon="arrow.down"
						disabled={!canMoveDown || reorderDisabled}
						onPress={onMoveDown}
					/>
				</View>
			) : isRidePlan ? (
				<View
					accessibilityLabel="선택된 라이딩 플랜"
					style={[styles.ridePlanRow, { borderColor: theme.separator, backgroundColor: `${theme.success}12` }]}
				>
					<AppIcon name="checkmark.circle.fill" size={17} tintColor={theme.success} />
					<ThemedText type="smallBold" style={{ color: theme.success }}>
						라이딩 플랜
					</ThemedText>
				</View>
			) : (
				<PressableHaptic
					accessibilityLabel={`${plan.name}, 이 플랜으로 라이딩`}
					disabled={isSelectingRidePlan}
					style={[
						styles.ridePlanButton,
						{ borderColor: theme.separator },
						isSelectingRidePlan ? styles.disabled : null,
					]}
					onPress={onSelectRidePlan}
				>
					<AppIcon name="checkmark.circle" size={17} tintColor={theme.tint} />
					<ThemedText type="small" style={{ color: theme.tint, fontWeight: "600" }}>
						이 플랜으로 라이딩
					</ThemedText>
				</PressableHaptic>
			)}
		</ListItemCard>
	);
}

function ReorderButton({
	label,
	icon,
	disabled,
	onPress,
}: {
	label: string;
	icon: string;
	disabled: boolean;
	onPress?: () => void;
}) {
	const theme = useTheme();
	return (
		<PressableHaptic
			accessibilityLabel={label}
			disabled={disabled}
			style={[styles.reorderButton, disabled ? styles.disabled : null]}
			onPress={onPress}
		>
			<AppIcon name={icon} size={15} tintColor={theme.tint} />
			<ThemedText type="caption" style={{ color: theme.tint, fontWeight: "600" }}>
				{label}
			</ThemedText>
		</PressableHaptic>
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
	stageDistance: { width: 62, fontVariant: ["tabular-nums"], fontWeight: "600" },
	stageEnd: { flex: 1, minWidth: 0 },
	stageGain: { width: 68, fontVariant: ["tabular-nums"] },
	reorderRow: {
		flexDirection: "row",
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	reorderButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
		minHeight: 44,
	},
	reorderDivider: { width: StyleSheet.hairlineWidth },
	disabled: { opacity: 0.3 },
	ridePlanRow: {
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	ridePlanButton: {
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
});
