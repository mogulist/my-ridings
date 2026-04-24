import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import type { StageMidPointGroup } from "@/features/plan-my-route/merge-mid-points";
import { useTheme } from "@/hooks/use-theme";

import { formatStageKmRange } from "./stage-weather-briefing-format";

type StageWeatherMidRepeatStripProps = {
	group: StageMidPointGroup;
	referenceKmRange: string | null;
};

export function StageWeatherMidRepeatStrip({
	group,
	referenceKmRange,
}: StageWeatherMidRepeatStripProps) {
	const theme = useTheme();
	const kmLine = formatStageKmRange(group.kmFrom, group.kmTo);
	const desc = referenceKmRange
		? `${referenceKmRange} 구간과 동일한 중기 예보`
		: "앞 구간과 동일한 중기 예보";
	return (
		<View
			style={[
				styles.strip,
				{
					backgroundColor: `${theme.tint}0F`,
					borderColor: theme.separator,
				},
			]}
		>
			<ThemedText type="caption" themeColor="tint" style={styles.icon}>
				↻
			</ThemedText>
			<ThemedText type="caption" themeColor="textSecondary" style={styles.km} numberOfLines={1}>
				{kmLine}
			</ThemedText>
			<ThemedText type="caption" themeColor="textSecondary" style={styles.desc} numberOfLines={2}>
				{desc}
			</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	strip: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		borderRadius: Radius.md,
		borderCurve: "continuous",
		borderWidth: StyleSheet.hairlineWidth,
	},
	icon: { fontSize: 14 },
	km: { fontVariant: ["tabular-nums"] },
	desc: { flexShrink: 1, textAlign: "right", flex: 1 },
});
