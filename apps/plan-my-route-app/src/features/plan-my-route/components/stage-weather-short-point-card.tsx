import type { StageShortPoint } from "@my-ridings/weather-types";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { weatherIconName } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

import { kstHourFromIso } from "./kst-hour";
import {
	formatGridMetaLine,
	formatStageKmRange,
	positionEndBadge,
} from "./stage-weather-briefing-format";

const COL_WIDTH = 52;

type StageWeatherShortPointCardProps = {
	point: StageShortPoint;
};

export function StageWeatherShortPointCard({ point }: StageWeatherShortPointCardProps) {
	const theme = useTheme();
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
					borderLeftColor: `${theme.tint}99`,
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
				단기
			</ThemedText>
			{!point.hourly.length ? (
				<View style={styles.empty}>
					<AppIcon name="cloud" size={18} tintColor={theme.textSecondary} />
					<ThemedText type="caption" themeColor="textSecondary">
						당일 시간대 예보가 없습니다
					</ThemedText>
				</View>
			) : (
				<View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator
						nestedScrollEnabled
						contentContainerStyle={styles.hScrollContent}
					>
						{point.hourly.map((h) => {
							const hour = kstHourFromIso(h.at);
							return (
								<View key={h.at} style={styles.col}>
									<ThemedText type="caption" themeColor="textSecondary" style={styles.hourText}>
										{hour}시
									</ThemedText>
									<AppIcon name={weatherIconName(h.sky, h.pty)} size={22} tintColor={theme.tint} />
									<ThemedText type="smallBold" style={styles.tempText}>
										{h.tempC != null ? `${h.tempC.toFixed(0)}°` : "—"}
									</ThemedText>
									<ThemedText
										type="caption"
										style={[
											styles.pop,
											h.popPct != null && h.popPct > 0
												? { color: "#4A90D9" }
												: { color: theme.textSecondary },
										]}
										numberOfLines={1}
									>
										{h.popPct != null && h.popPct > 0 ? `${h.popPct}%` : "—"}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										numberOfLines={1}
										style={styles.muted}
									>
										{h.rainMm != null && h.rainMm > 0
											? `${h.rainMm}mm`
											: h.rainMm === 0
												? "0"
												: "—"}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										numberOfLines={1}
										style={styles.muted}
									>
										{h.humidityPct != null ? `${h.humidityPct}%` : "—"}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										numberOfLines={1}
										style={styles.muted}
									>
										{h.windMs != null ? `${h.windMs.toFixed(1)}m/s` : "—"}
									</ThemedText>
								</View>
							);
						})}
					</ScrollView>
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
	hScrollContent: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 0,
	},
	col: {
		width: COL_WIDTH,
		alignItems: "center",
		gap: 4,
		paddingTop: Spacing.one,
	},
	hourText: { fontVariant: ["tabular-nums"] },
	tempText: { fontVariant: ["tabular-nums"] },
	pop: { fontVariant: ["tabular-nums"] },
	muted: { fontSize: 10, fontVariant: ["tabular-nums"] },
});
