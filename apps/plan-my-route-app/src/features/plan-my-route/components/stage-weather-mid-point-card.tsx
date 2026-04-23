import type { StageMidPoint } from "@my-ridings/weather-types";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
	formatGridMetaLine,
	formatStageKmRange,
	positionEndBadge,
} from "./stage-weather-briefing-format";

const midLine = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);

type StageWeatherMidPointCardProps = {
	point: StageMidPoint;
};

export function StageWeatherMidPointCard({ point }: StageWeatherMidPointCardProps) {
	const theme = useTheme();
	const d = point.daily;
	const title = point.regionName?.trim() || "지역명 없음";
	const endBadge = positionEndBadge(point.position);
	const { lat, lng } = point.midpoint;

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: theme.surfaceElevated,
					borderColor: theme.separator,
					borderLeftWidth: 3,
					borderLeftColor: theme.tint,
				},
			]}
		>
			<View style={styles.row1}>
				<ThemedText type="smallBold" numberOfLines={2} style={styles.titleFlex}>
					{title}
				</ThemedText>
				{endBadge ? (
					<ThemedText type="caption" themeColor="textSecondary" style={styles.endBadge}>
						{endBadge}
					</ThemedText>
				) : null}
			</View>
			<View style={styles.row2}>
				<ThemedText type="caption" themeColor="textSecondary" style={styles.kmLine}>
					{formatStageKmRange(point.kmFrom, point.kmTo)}
				</ThemedText>
				<ThemedText
					type="caption"
					themeColor="textSecondary"
					numberOfLines={2}
					style={styles.metaRight}
				>
					{formatGridMetaLine(point.nx, point.ny, lat, lng)}
				</ThemedText>
			</View>
			<ThemedText type="caption" themeColor="tint" style={styles.modeTag}>
				중기
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
	row1: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: Spacing.two,
	},
	titleFlex: { flex: 1, minWidth: 0 },
	endBadge: { flexShrink: 0, marginTop: 1 },
	row2: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: Spacing.two,
	},
	kmLine: { fontVariant: ["tabular-nums"], flex: 1, minWidth: 0 },
	metaRight: { flexShrink: 1, textAlign: "right", maxWidth: "58%" },
	modeTag: { fontWeight: "600" },
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
