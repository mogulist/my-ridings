import type { StageShortPoint } from "@my-ridings/weather-types";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Spacing } from "@/constants/theme";
import { weatherIconName } from "@/features/plan-my-route/plan-stage-forecast-query";
import { useTheme } from "@/hooks/use-theme";

import { kstHourFromIso } from "./kst-hour";

const COL_WIDTH = 58;

const roleLabel = (i: number) =>
	["출발", "지점 1", "지점 2", "지점 3", "도착"][i] ?? `지점 ${i + 1}`;

type StageWeatherShortPointCardProps = {
	point: StageShortPoint;
};

export function StageWeatherShortPointCard({ point }: StageWeatherShortPointCardProps) {
	const theme = useTheme();
	const scrollRef = useRef<ScrollView>(null);
	const [viewportW, setViewportW] = useState(0);
	const anchor = point.scrollAnchorLocalHour;
	const anchorIndex = useMemo(() => {
		if (!point.hourly.length) return 0;
		let bestI = 0;
		let bestD = 999;
		for (let i = 0; i < point.hourly.length; i += 1) {
			const kh = kstHourFromIso(point.hourly[i].at);
			const d = Math.abs(kh - anchor);
			if (d < bestD) {
				bestD = d;
				bestI = i;
			}
		}
		return bestI;
	}, [point.hourly, anchor]);

	useLayoutEffect(() => {
		if (viewportW <= 0 || !point.hourly.length) return;
		const x = Math.max(0, anchorIndex * COL_WIDTH - viewportW / 2 + COL_WIDTH / 2);
		const id = requestAnimationFrame(() =>
			scrollRef.current?.scrollTo({ x, y: 0, animated: false }),
		);
		return () => cancelAnimationFrame(id);
	}, [anchorIndex, point.hourly.length, viewportW]);

	const onLayout = (e: LayoutChangeEvent) => {
		setViewportW(e.nativeEvent.layout.width);
	};

	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: theme.surfaceElevated, borderColor: theme.separator },
			]}
		>
			<View style={styles.topBlock}>
				<ThemedText type="smallBold" numberOfLines={1}>
					{roleLabel(point.index)}
				</ThemedText>
				<ThemedText
					type="caption"
					themeColor="textSecondary"
					numberOfLines={2}
					style={styles.gridLabel}
				>
					{point.gridLabel}
				</ThemedText>
				<ThemedText type="caption" themeColor="textSecondary" style={styles.kmText}>
					{point.kmAlong.toFixed(1)} km · 앵커 {anchor}시
				</ThemedText>
			</View>
			{!point.hourly.length ? (
				<View style={styles.empty}>
					<AppIcon name="cloud" size={18} tintColor={theme.textSecondary} />
					<ThemedText type="caption" themeColor="textSecondary">
						당일 시간대 예보가 없습니다
					</ThemedText>
				</View>
			) : (
				<View onLayout={onLayout} style={styles.scrollWrap}>
					<ScrollView
						ref={scrollRef}
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
	topBlock: { gap: Spacing.one },
	gridLabel: { lineHeight: 16 },
	kmText: { fontVariant: ["tabular-nums"] },
	empty: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	scrollWrap: { minHeight: 200 },
	hScrollContent: {
		paddingBottom: Spacing.two,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 0,
	},
	col: { width: COL_WIDTH, alignItems: "center", gap: 4, paddingVertical: Spacing.one },
	hourText: { fontVariant: ["tabular-nums"] },
	tempText: { fontVariant: ["tabular-nums"] },
	pop: { fontVariant: ["tabular-nums"] },
	muted: { fontSize: 10, fontVariant: ["tabular-nums"] },
});
