import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { midTermSkyIconName } from "@/features/plan-my-route/mid-term-sky-icon";
import type { StageMidPointGroup } from "@/features/plan-my-route/merge-mid-points";
import { useTheme } from "@/hooks/use-theme";

import {
	formatGridMetaLine,
	formatRegionTitle,
	formatStageKmRange,
	positionEndBadge,
} from "./stage-weather-briefing-format";

const midLine = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);

const formatPopLabel = (pop: number | null | undefined) =>
	pop != null && Number.isFinite(pop) ? `${Math.round(pop)}%` : "—";

type StageWeatherMidPointCardProps = {
	group: StageMidPointGroup;
};

export function StageWeatherMidPointCard({ group }: StageWeatherMidPointCardProps) {
	const theme = useTheme();
	const d = group.daily;
	const title = formatRegionTitle(group.regionNames);
	const endBadge = positionEndBadge(group.position);
	const { lat, lng } = group.midpoint;
	const subCaption = group.members.length <= 1 ? null : `동일 중기 예보 ${group.members.length}구간 통합`;

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
					{formatStageKmRange(group.kmFrom, group.kmTo)}
				</ThemedText>
				<ThemedText
					type="caption"
					themeColor="textSecondary"
					numberOfLines={2}
					style={styles.metaRight}
				>
					{formatGridMetaLine(group.nx, group.ny, lat, lng)}
					{group.gridCount > 1 ? ` 외 ${group.gridCount - 1}` : ""}
				</ThemedText>
			</View>
			{!d ? (
				<View style={styles.empty}>
					<AppIcon name="cloud" size={18} tintColor={theme.textSecondary} />
					<ThemedText type="caption" themeColor="textSecondary">
						중기 예보 없음
					</ThemedText>
				</View>
			) : (
				<View style={styles.forecastBlock}>
					<View
						style={[
							styles.headerRow,
							{ borderBottomColor: theme.separator },
						]}
					>
						<ThemedText
							type="caption"
							themeColor="textSecondary"
							style={[styles.headerCell, styles.headerCellAmPm]}
						>
							오전
						</ThemedText>
						<ThemedText
							type="caption"
							themeColor="textSecondary"
							style={[styles.headerCell, styles.headerCellAmPm]}
						>
							오후
						</ThemedText>
						<ThemedText
							type="caption"
							themeColor="textSecondary"
							style={[styles.headerCell, styles.headerCellTemp]}
						>
							최저 / 최고
						</ThemedText>
					</View>
					<View style={styles.dataRow}>
						<View
							style={[styles.halfSlot, styles.amRow]}
							accessibilityLabel={`오전 ${formatPopLabel(d.amPop)}, ${midLine(d.amSky) ?? "정보 없음"}`}
						>
							<ThemedText
								type="small"
								style={[
									styles.popText,
									d.amPop != null && d.amPop > 0
										? styles.popActive
										: { color: theme.textSecondary },
								]}
							>
								{formatPopLabel(d.amPop)}
							</ThemedText>
							<AppIcon
								name={midTermSkyIconName(d.amSky)}
								size={26}
								tintColor={theme.text}
								style={styles.skyIcon}
							/>
						</View>
						<View
							style={[styles.halfSlot, styles.pmRow]}
							accessibilityLabel={`오후 ${midLine(d.pmSky) ?? "정보 없음"}, ${formatPopLabel(d.pmPop)}`}
						>
							<AppIcon
								name={midTermSkyIconName(d.pmSky)}
								size={26}
								tintColor={theme.text}
								style={styles.skyIcon}
							/>
							<ThemedText
								type="small"
								style={[
									styles.popText,
									d.pmPop != null && d.pmPop > 0
										? styles.popActive
										: { color: theme.textSecondary },
								]}
							>
								{formatPopLabel(d.pmPop)}
							</ThemedText>
						</View>
						<View style={styles.tempSlot} accessibilityLabel="최저·최고 기온">
							{d.tmn != null || d.tmx != null ? (
								<ThemedText type="smallBold" style={styles.tempOneLine}>
									{d.tmn != null ? (
										<ThemedText type="smallBold" style={styles.tmnBlue}>
											{d.tmn}°
										</ThemedText>
									) : (
										<ThemedText type="smallBold" themeColor="textSecondary">
											—
										</ThemedText>
									)}
									<ThemedText type="smallBold" themeColor="textSecondary">
										{" "}/{" "}
									</ThemedText>
									{d.tmx != null ? (
										<ThemedText type="smallBold" style={[styles.tmxRed, { color: theme.danger }]}>
											{d.tmx}°
										</ThemedText>
									) : (
										<ThemedText type="smallBold" themeColor="textSecondary">
											—
										</ThemedText>
									)}
								</ThemedText>
							) : (
								<ThemedText type="smallBold" themeColor="textSecondary">
									— / —
								</ThemedText>
							)}
						</View>
					</View>
				</View>
			)}
			{subCaption ? (
				<ThemedText type="caption" themeColor="textSecondary" style={styles.subCaption}>
					{subCaption}
				</ThemedText>
			) : null}
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
	empty: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	forecastBlock: {
		gap: Spacing.one,
		paddingTop: 2,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingBottom: Spacing.one,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	headerCell: {
		fontWeight: "600",
	},
	headerCellAmPm: {
		flex: 1,
		textAlign: "center",
	},
	headerCellTemp: {
		minWidth: 96,
		textAlign: "right",
	},
	dataRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingTop: Spacing.two,
	},
	halfSlot: {
		flex: 1,
		minWidth: 0,
	},
	amRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
	pmRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
	popText: {
		fontVariant: ["tabular-nums"],
		minWidth: 40,
		textAlign: "right",
	},
	popActive: { color: "#4A90D9" },
	skyIcon: { flexShrink: 0 },
	tempSlot: {
		minWidth: 96,
		alignItems: "flex-end",
		justifyContent: "center",
	},
	tempOneLine: { fontVariant: ["tabular-nums"], textAlign: "right" },
	tmnBlue: { color: "#2F6FED" },
	tmxRed: {},
	subCaption: { marginTop: Spacing.one },
});
