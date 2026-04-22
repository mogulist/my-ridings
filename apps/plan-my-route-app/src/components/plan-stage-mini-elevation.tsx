import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import type { MobilePlanStageRow, TrackPoint } from "@/features/api/plan-my-route";
import { useTheme } from "@/hooks/use-theme";

const CHART_HEIGHT = 76;
const BIN_COUNT = 72;
const CURRENT_DOT_SIZE = 10;

export type PlanStageMiniElevationProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	currentRelKm?: number | null;
};

export function PlanStageMiniElevation({
	stage,
	trackPoints,
	currentRelKm,
}: PlanStageMiniElevationProps) {
	const theme = useTheme();

	const chart = useMemo(() => buildStageElevationBins(trackPoints, stage), [stage, trackPoints]);

	const stageStartM = stage.start_distance ?? 0;
	const stageEndM = stage.end_distance ?? stageStartM;
	const stageLenM = Math.max(stageEndM - stageStartM, 0);
	const markerRatio =
		currentRelKm == null || stageLenM <= 0
			? null
			: Math.min(Math.max((currentRelKm * 1000) / stageLenM, 0), 1);

	const startKmLabel = (stageStartM / 1000).toFixed(1);
	const endKmLabel = (stageEndM / 1000).toFixed(1);

	return (
		<View style={styles.wrap}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				고도
			</ThemedText>
			<Card style={styles.card}>
				{chart == null ? (
					<ThemedText type="small" themeColor="textSecondary">
						이 구간 고도 샘플이 없습니다.
					</ThemedText>
				) : (
					<>
						<View style={styles.chartOuter}>
							<View style={[styles.chartInner, { height: CHART_HEIGHT }]}>
								{chart.bins.map((elev, i) => {
									const flat = chart.maxM === chart.minM;
									const h = flat
										? CHART_HEIGHT * 0.45
										: ((elev - chart.minM) / chart.rangeM) * CHART_HEIGHT;
									const barH = Math.max(2, Math.min(CHART_HEIGHT, h));
									const t = (i + 0.5) / BIN_COUNT;
									const isBeforeMarker = markerRatio == null || t <= markerRatio + 0.001;
									const fill = isBeforeMarker
										? withAlpha(theme.tint, 0.72)
										: withAlpha(theme.textSecondary, 0.22);
									return (
										<View key={i} style={styles.barSlot}>
											<View
												style={[
													styles.bar,
													{
														height: barH,
														backgroundColor: fill,
													},
												]}
											/>
										</View>
									);
								})}
								{markerRatio != null ? (
									<View
										pointerEvents="none"
										style={[
											styles.markerLine,
											{
												left: `${markerRatio * 100}%`,
												backgroundColor: theme.tint,
											},
										]}
									/>
								) : null}
								{markerRatio != null ? (
									<View
										pointerEvents="none"
										style={[
											styles.markerDot,
											{
												left: `${markerRatio * 100}%`,
												backgroundColor: theme.tint,
												boxShadow: `0 0 8px ${withAlpha(theme.tint, 0.55)}`,
											},
										]}
									/>
								) : null}
							</View>
						</View>
						<View style={styles.axisLabels}>
							<ThemedText type="caption" themeColor="textSecondary" style={styles.axisKm}>
								{startKmLabel} km
							</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary" style={styles.axisKm}>
								{endKmLabel} km
							</ThemedText>
						</View>
					</>
				)}
			</Card>
		</View>
	);
}

function withAlpha(hex: string, alpha: number): string {
	if (hex.startsWith("#") && hex.length === 7) {
		const r = Number.parseInt(hex.slice(1, 3), 16);
		const g = Number.parseInt(hex.slice(3, 5), 16);
		const b = Number.parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return hex;
}

const styles = StyleSheet.create({
	wrap: {
		gap: Spacing.two,
	},
	sectionTitle: {
		marginBottom: Spacing.half,
	},
	card: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
	},
	chartOuter: {
		width: "100%",
	},
	chartInner: {
		flexDirection: "row",
		alignItems: "flex-end",
		width: "100%",
		position: "relative",
	},
	barSlot: {
		flex: 1,
		alignItems: "stretch",
		justifyContent: "flex-end",
		paddingHorizontal: 0.25,
		minWidth: 0,
	},
	bar: {
		width: "100%",
		borderRadius: 2,
	},
	markerLine: {
		position: "absolute",
		top: 0,
		bottom: 0,
		width: 2,
		marginLeft: -1,
		opacity: 0.85,
	},
	markerDot: {
		position: "absolute",
		top: -CURRENT_DOT_SIZE / 2,
		width: CURRENT_DOT_SIZE,
		height: CURRENT_DOT_SIZE,
		borderRadius: CURRENT_DOT_SIZE / 2,
		marginLeft: -CURRENT_DOT_SIZE / 2,
	},
	axisLabels: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: Spacing.two,
	},
	axisKm: {
		fontVariant: ["tabular-nums"],
	},
});

type BinChart = {
	bins: number[];
	minM: number;
	maxM: number;
	rangeM: number;
};

function buildStageElevationBins(
	trackPoints: TrackPoint[],
	stage: MobilePlanStageRow,
): BinChart | null {
	const startM = stage.start_distance ?? 0;
	const endM = stage.end_distance ?? startM;
	if (!(endM > startM)) return null;

	const inRange = trackPoints.filter(
		(p): p is TrackPoint & { d: number; e: number } =>
			p.d != null && p.e != null && p.d >= startM && p.d <= endM,
	);
	if (inRange.length === 0) return null;

	let minM = Infinity;
	let maxM = -Infinity;
	for (const p of inRange) {
		if (p.e < minM) minM = p.e;
		if (p.e > maxM) maxM = p.e;
	}
	if (!Number.isFinite(minM) || !Number.isFinite(maxM)) return null;

	const rangeM = maxM === minM ? 1 : maxM - minM;

	const spanM = endM - startM;
	const bucketMax: (number | undefined)[] = Array.from({ length: BIN_COUNT }, () => undefined);

	for (const p of inRange) {
		const t = (p.d - startM) / spanM;
		const idx = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor(t * BIN_COUNT)));
		const cur = bucketMax[idx];
		if (cur === undefined || p.e > cur) bucketMax[idx] = p.e;
	}

	const filled = fillElevationBuckets(bucketMax, minM);

	return {
		bins: filled,
		minM,
		maxM,
		rangeM,
	};
}

function fillElevationBuckets(bucketMax: (number | undefined)[], seedMinM: number): number[] {
	const out: number[] = [];
	let carry = seedMinM;
	for (let i = 0; i < bucketMax.length; i++) {
		const v = bucketMax[i];
		if (v !== undefined) carry = v;
		out.push(carry);
	}
	return out;
}
