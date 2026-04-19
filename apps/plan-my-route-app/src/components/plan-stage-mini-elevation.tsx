import { useMemo } from 'react';
import { StyleSheet, type ViewStyle, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MobilePlanStageRow, TrackPoint } from '@/features/api/plan-my-route';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const CHART_HEIGHT = 76;
const BIN_COUNT = 72;
const CURRENT_DOT_SIZE = 10;

export type PlanStageMiniElevationProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	/** 스테이지 기준 상대 km. 범위 안일 때만 마커 표시 */
	currentRelKm?: number | null;
};

export function PlanStageMiniElevation({
	stage,
	trackPoints,
	currentRelKm,
}: PlanStageMiniElevationProps) {
	const colorScheme = useColorScheme();
	const theme = useTheme();

	const chart = useMemo(
		() => buildStageElevationBins(trackPoints, stage),
		[stage, trackPoints],
	);

	const barColor =
		colorScheme === 'dark' ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';

	const stageStartM = stage.start_distance ?? 0;
	const stageEndM = stage.end_distance ?? stageStartM;
	const stageLenM = Math.max(stageEndM - stageStartM, 0);
	const markerRatio =
		currentRelKm == null || stageLenM <= 0
			? null
			: Math.min(Math.max((currentRelKm * 1000) / stageLenM, 0), 1);

	return (
		<View style={styles.wrap}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				고도
			</ThemedText>
			<View style={[styles.card, { borderColor: '#A0A4AE' }]}>
				{chart == null ? (
					<ThemedText type="small" themeColor="textSecondary">
						이 구간 고도 샘플이 없습니다.
					</ThemedText>
				) : (
					<View style={styles.chartOuter}>
						<View style={[styles.chartInner, { height: CHART_HEIGHT }]}>
							{chart.bins.map((elev, i) => {
								const flat = chart.maxM === chart.minM;
								const h = flat
									? CHART_HEIGHT * 0.45
									: ((elev - chart.minM) / chart.rangeM) * CHART_HEIGHT;
								const barH = Math.max(2, Math.min(CHART_HEIGHT, h));
								return (
									<View key={i} style={styles.barSlot}>
										<View
											style={[
												styles.bar,
												{
													height: barH,
													backgroundColor: barColor,
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
											backgroundColor: theme.text,
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
											backgroundColor: theme.text,
										},
									]}
								/>
							) : null}
						</View>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: Spacing.two,
	},
	sectionTitle: {
		marginBottom: Spacing.half,
	},
	card: {
		borderWidth: 1,
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
	},
	chartOuter: {
		width: '100%',
	},
	chartInner: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		width: '100%',
		position: 'relative',
	},
	barSlot: {
		flex: 1,
		alignItems: 'stretch',
		justifyContent: 'flex-end',
		paddingHorizontal: 0.25,
		minWidth: 0,
	},
	bar: {
		width: '100%',
		borderRadius: 1,
	},
	markerLine: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 2,
		marginLeft: -1,
		opacity: 0.85,
	},
	markerDot: {
		position: 'absolute',
		top: -CURRENT_DOT_SIZE / 2,
		width: CURRENT_DOT_SIZE,
		height: CURRENT_DOT_SIZE,
		borderRadius: CURRENT_DOT_SIZE / 2,
		marginLeft: -CURRENT_DOT_SIZE / 2,
	},
}) satisfies Record<string, ViewStyle>;

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

/** 빈 버킷: 직전 고도 유지(전방 채움)으로 스텝형 실루엣 */
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
