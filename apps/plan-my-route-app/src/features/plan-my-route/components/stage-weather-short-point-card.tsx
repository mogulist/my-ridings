import { StyleSheet, View } from "react-native";
import Animated, {
	scrollTo,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useDerivedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { ListItemCard } from "@/components/ui/list-item-card";
import { Spacing } from "@/constants/theme";
import {
	pickDisplayTempC,
	type StageShortPointGroup,
} from "@/features/plan-my-route/merge-short-points";
import { weatherIconName } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

import { kstHourFromIso } from "./kst-hour";
import {
	formatGridMetaLine,
	formatRegionTitle,
	formatStageKmRange,
	positionEndBadge,
} from "./stage-weather-briefing-format";
import { NO_ACTIVE_ID, useSyncedHorizontalScroll } from "./synced-horizontal-scroll";

const COL_WIDTH = 52;

type StageWeatherShortPointCardProps = {
	group: StageShortPointGroup;
};

export function StageWeatherShortPointCard({ group }: StageWeatherShortPointCardProps) {
	const theme = useTheme();
	const title = formatRegionTitle(group.regionNames);
	const endBadge = positionEndBadge(group.position);
	const { lat, lng } = group.midpoint;
	const subCaption = formatGroupSubCaption(group);

	const synced = useSyncedHorizontalScroll();
	const animatedRef = useAnimatedRef<Animated.ScrollView>();
	const cardId = group.members[0]?.index ?? 0;

	const scrollHandler = useAnimatedScrollHandler({
		onBeginDrag: () => {
			if (!synced) return;
			synced.activeId.value = cardId;
		},
		onScroll: (e) => {
			if (!synced) return;
			if (synced.activeId.value === cardId) {
				synced.scrollX.value = e.contentOffset.x;
			}
		},
		onMomentumEnd: () => {
			if (!synced) return;
			if (synced.activeId.value === cardId) {
				synced.activeId.value = NO_ACTIVE_ID;
			}
		},
		onEndDrag: (e) => {
			if (!synced) return;
			if (synced.activeId.value === cardId) {
				synced.scrollX.value = e.contentOffset.x;
			}
		},
	});

	useDerivedValue(() => {
		if (!synced) return;
		if (synced.activeId.value !== cardId) {
			scrollTo(animatedRef, synced.scrollX.value, 0, false);
		}
	});

	return (
		<ListItemCard>
			<View style={styles.cardInner}>
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
			{!group.representativeHourly.length ? (
				<View style={styles.empty}>
					<AppIcon name="cloud" size={18} tintColor={theme.textSecondary} />
					<ThemedText type="caption" themeColor="textSecondary">
						당일 시간대 예보가 없습니다
					</ThemedText>
				</View>
			) : (
				<View>
					<Animated.ScrollView
						ref={animatedRef}
						horizontal
						showsHorizontalScrollIndicator
						nestedScrollEnabled
						scrollEventThrottle={16}
						onScroll={synced ? scrollHandler : undefined}
						contentContainerStyle={styles.hScrollContent}
					>
						{group.representativeHourly.map((h, i) => {
							const hour = kstHourFromIso(h.at);
							const range = group.hourlyTemps[i];
							const displayTempC = range ? pickDisplayTempC(range, hour) : null;
							return (
								<View key={h.at} style={styles.col}>
									<ThemedText type="caption" themeColor="textSecondary" style={styles.hourText}>
										{hour}시
									</ThemedText>
									<AppIcon name={weatherIconName(h.sky, h.pty)} size={22} tintColor={theme.tint} />
									<ThemedText type="smallBold" style={styles.tempText}>
										{displayTempC == null ? "—" : `${Math.round(displayTempC)}°`}
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
					</Animated.ScrollView>
					{subCaption ? (
						<ThemedText type="caption" themeColor="textSecondary" style={styles.subCaption}>
							{subCaption}
						</ThemedText>
					) : null}
				</View>
			)}
			</View>
		</ListItemCard>
	);
}

const formatGroupSubCaption = (group: StageShortPointGroup): string | null => {
	if (group.members.length <= 1) return null;
	return `유사 예보 ${group.members.length}구간 통합`;
};

const styles = StyleSheet.create({
	cardInner: {
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
	subCaption: { marginTop: Spacing.one },
});
