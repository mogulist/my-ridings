import type { StageMidPoint } from "@my-ridings/weather-types";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const midLine = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);

export const POINT_ROLES = ["출발", "지점 1", "지점 2", "지점 3", "도착"] as const;

type StageWeatherMidPointCardProps = {
	point: StageMidPoint;
	role: string;
};

export function StageWeatherMidPointCard({ point, role }: StageWeatherMidPointCardProps) {
	const theme = useTheme();
	const d = point.daily;
	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: theme.surfaceElevated, borderColor: theme.separator },
			]}
		>
			<View style={styles.topRow}>
				<ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
					{role}
				</ThemedText>
				<ThemedText
					type="caption"
					themeColor="textSecondary"
					numberOfLines={2}
					style={styles.gridLabel}
				>
					{point.gridLabel}
				</ThemedText>
			</View>
			<ThemedText type="caption" themeColor="textSecondary" style={styles.kmText}>
				{point.kmAlong.toFixed(1)} km
			</ThemedText>
			{!d ? (
				<View style={styles.empty}>
					<AppIcon name="cloud" size={18} tintColor={theme.textSecondary} />
					<ThemedText type="caption" themeColor="textSecondary">
						중기 예보 없음
					</ThemedText>
				</View>
			) : (
				<View style={styles.grid}>
					<View style={styles.halfCol}>
						<ThemedText type="caption" themeColor="textSecondary" style={styles.ampmLabel}>
							오전
						</ThemedText>
						{d.amPop != null && (
							<ThemedText type="small" style={styles.pop}>
								{d.amPop}%
							</ThemedText>
						)}
						<ThemedText type="small" numberOfLines={1} style={styles.skyText}>
							{midLine(d.amSky) || "—"}
						</ThemedText>
					</View>
					<View style={styles.halfCol}>
						<ThemedText type="caption" themeColor="textSecondary" style={styles.ampmLabel}>
							오후
						</ThemedText>
						{d.pmPop != null && (
							<ThemedText type="small" style={styles.pop}>
								{d.pmPop}%
							</ThemedText>
						)}
						<ThemedText type="small" numberOfLines={1} style={styles.skyText}>
							{midLine(d.pmSky) || "—"}
						</ThemedText>
					</View>
					<View style={styles.tempCol}>
						{d.tmn != null && (
							<ThemedText type="smallBold" style={styles.tmnBlue}>
								{d.tmn}°
							</ThemedText>
						)}
						{d.tmx != null && (
							<ThemedText type="smallBold" style={[styles.tmxRed, { color: theme.danger }]}>
								{d.tmx}°
							</ThemedText>
						)}
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		borderWidth: StyleSheet.hairlineWidth,
		padding: Spacing.three,
		gap: Spacing.two,
	},
	topRow: {
		gap: Spacing.one,
	},
	title: {
		flex: 0,
	},
	gridLabel: {
		lineHeight: 16,
	},
	kmText: {
		fontVariant: ["tabular-nums"],
	},
	empty: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	grid: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: Spacing.three,
	},
	halfCol: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	ampmLabel: {
		fontWeight: "600",
	},
	pop: {
		color: "#4A90D9",
	},
	skyText: {
		lineHeight: 18,
	},
	tempCol: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.one,
	},
	tmnBlue: { color: "#2F6FED" },
	tmxRed: {},
});
