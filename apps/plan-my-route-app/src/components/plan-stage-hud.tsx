import { computeTrackElevationGainLoss } from '@my-ridings/plan-geometry';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type {
	MobilePlanStageRow,
	SummitMarkerOnRoute,
	TrackPoint,
} from '@/features/api/plan-my-route';
import { useTheme } from '@/hooks/use-theme';

export type PlanStageHudProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	summitMarkers: SummitMarkerOnRoute[];
	currentRelKm: number | null;
};

export function PlanStageHud({
	stage,
	trackPoints,
	summitMarkers,
	currentRelKm,
}: PlanStageHudProps) {
	const theme = useTheme();
	const gainColor = theme.gain;
	const lossColor = theme.loss;

	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const stageLenKm = Math.max(stageEndKm - stageStartKm, 0);

	const segments = useMemo(() => {
		if (currentRelKm == null) return null;
		const currentAbsKm = stageStartKm + currentRelKm;
		const ridden = computeTrackElevationGainLoss(trackPoints, stageStartKm, currentAbsKm);
		const remaining = computeTrackElevationGainLoss(trackPoints, currentAbsKm, stageEndKm);
		return { ridden, remaining };
	}, [currentRelKm, stageEndKm, stageStartKm, trackPoints]);

	const nextSummit = useMemo(() => {
		if (currentRelKm == null) return null;
		const currentAbsKm = stageStartKm + currentRelKm;
		const inStageAhead = summitMarkers
			.filter((s) => s.distanceKm > currentAbsKm + 1e-6 && s.distanceKm <= stageEndKm + 1e-6)
			.sort((a, b) => a.distanceKm - b.distanceKm);
		const next = inStageAhead[0];
		if (!next) return null;
		return {
			name: next.name,
			deltaKm: next.distanceKm - currentAbsKm,
			elevation: next.elevation,
		};
	}, [currentRelKm, stageEndKm, stageStartKm, summitMarkers]);

	if (currentRelKm == null) return null;

	const remainingKm = Math.max(stageLenKm - currentRelKm, 0);

	return (
		<View style={styles.wrap}>
			<Card style={styles.card}>
				<View style={styles.row}>
					<AppIcon name="bicycle" size={20} tintColor={theme.tint} />
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						탔음
					</ThemedText>
					<View style={styles.metricTextRow}>
						<ThemedText type="metric" style={styles.kmCell}>
							{currentRelKm.toFixed(1)}
						</ThemedText>
						<ThemedText type="caption" themeColor="textSecondary">
							{' '}
							km
						</ThemedText>
					</View>
					{segments ? (
						<ThemedText type="metricSm" style={[styles.gainCell, { color: gainColor }]}>
							+{segments.ridden.gain.toLocaleString()} m
						</ThemedText>
					) : (
						<ThemedText type="small" themeColor="textSecondary" style={styles.gainCell}>
							—
						</ThemedText>
					)}
				</View>

				<View style={styles.row}>
					<AppIcon name="flag.checkered" size={20} tintColor={theme.tint} />
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						남음
					</ThemedText>
					<View style={styles.metricTextRow}>
						<ThemedText type="metric" style={styles.kmCell}>
							{remainingKm.toFixed(1)}
						</ThemedText>
						<ThemedText type="caption" themeColor="textSecondary">
							{' '}
							km
						</ThemedText>
					</View>
					{segments ? (
						<ThemedText type="metricSm" style={[styles.gainCell, { color: gainColor }]}>
							+{segments.remaining.gain.toLocaleString()} m
						</ThemedText>
					) : (
						<ThemedText type="small" themeColor="textSecondary" style={styles.gainCell}>
							—
						</ThemedText>
					)}
				</View>

				<View style={[styles.row, styles.summitRow]}>
					<AppIcon name="mountain.2.fill" size={20} tintColor={theme.tint} />
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						다음 서밋
					</ThemedText>
					{nextSummit ? (
						<>
							<View style={styles.metricTextRow}>
								<ThemedText type="metric" style={styles.kmCell}>
									{nextSummit.deltaKm.toFixed(1)}
								</ThemedText>
								<ThemedText type="caption" themeColor="textSecondary">
									{' '}
									km
								</ThemedText>
							</View>
							<ThemedText type="metricSm" style={[styles.gainCell, { color: lossColor }]}>
								↑ {Math.round(nextSummit.elevation).toLocaleString()} m
							</ThemedText>
						</>
					) : (
						<ThemedText type="small" themeColor="textSecondary" style={styles.summitEmpty}>
							이 스테이지에는 남은 서밋이 없습니다
						</ThemedText>
					)}
				</View>
				{nextSummit ? (
					<ThemedText
						type="small"
						themeColor="textSecondary"
						numberOfLines={1}
						style={styles.summitName}>
						{nextSummit.name}
					</ThemedText>
				) : null}
			</Card>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: Spacing.two,
	},
	card: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.three,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: Spacing.two,
		flexWrap: 'wrap',
	},
	summitRow: {
		marginTop: Spacing.half,
	},
	label: {
		width: 52,
	},
	metricTextRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		minWidth: 88,
	},
	kmCell: {
		fontVariant: ['tabular-nums'],
		flexShrink: 0,
	},
	gainCell: {
		fontVariant: ['tabular-nums'],
		marginLeft: 'auto',
	},
	summitEmpty: {
		flex: 1,
	},
	summitName: {
		paddingLeft: 28 + 52 + Spacing.two,
	},
});
