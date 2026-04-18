import { useMemo } from 'react';
import { StyleSheet, type ViewStyle, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MobilePlanStageRow, TrackPoint } from '@/features/api/plan-my-route';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CHART_HEIGHT = 76;
const BIN_COUNT = 72;

export type PlanStageMiniElevationProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
};

export function PlanStageMiniElevation({ stage, trackPoints }: PlanStageMiniElevationProps) {
	const colorScheme = useColorScheme();

	const chart = useMemo(
		() => buildStageElevationBins(trackPoints, stage),
		[stage, trackPoints],
	);

	const barColor =
		colorScheme === 'dark' ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';

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
