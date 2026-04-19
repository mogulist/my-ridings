import { computeTrackElevationGainLoss } from '@my-ridings/plan-geometry';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type {
	MobilePlanStageRow,
	SummitMarkerOnRoute,
	TrackPoint,
} from '@/features/api/plan-my-route';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type PlanStageHudProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	summitMarkers: SummitMarkerOnRoute[];
	/** 스테이지 기준 상대 km (0…stageLenKm). 없으면 HUD 비표시 */
	currentRelKm: number | null;
};

export function PlanStageHud({
	stage,
	trackPoints,
	summitMarkers,
	currentRelKm,
}: PlanStageHudProps) {
	const colorScheme = useColorScheme();
	const gainColor = colorScheme === 'dark' ? '#4ade80' : '#15803d';
	const lossColor = colorScheme === 'dark' ? '#f87171' : '#b91c1c';

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
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				HUD
			</ThemedText>
			<View style={styles.card}>
				<View style={styles.row}>
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						탔음
					</ThemedText>
					<ThemedText type="smallBold" style={styles.kmCell}>
						{currentRelKm.toFixed(1)} km
					</ThemedText>
					{segments ? (
						<ThemedText type="small" style={[styles.gainCell, { color: gainColor }]}>
							+{segments.ridden.gain.toLocaleString()} m
						</ThemedText>
					) : (
						<ThemedText type="small" themeColor="textSecondary" style={styles.gainCell}>
							—
						</ThemedText>
					)}
				</View>

				<View style={styles.row}>
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						남음
					</ThemedText>
					<ThemedText type="smallBold" style={styles.kmCell}>
						{remainingKm.toFixed(1)} km
					</ThemedText>
					{segments ? (
						<ThemedText type="small" style={[styles.gainCell, { color: gainColor }]}>
							+{segments.remaining.gain.toLocaleString()} m
						</ThemedText>
					) : (
						<ThemedText type="small" themeColor="textSecondary" style={styles.gainCell}>
							—
						</ThemedText>
					)}
				</View>

				<View style={[styles.row, styles.summitRow]}>
					<ThemedText type="small" themeColor="textSecondary" style={styles.label}>
						다음 서밋
					</ThemedText>
					{nextSummit ? (
						<>
							<ThemedText type="smallBold" style={styles.kmCell}>
								{nextSummit.deltaKm.toFixed(1)} km
							</ThemedText>
							<ThemedText type="small" style={[styles.gainCell, { color: lossColor }]}>
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
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.two,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'baseline',
		columnGap: Spacing.three,
	},
	summitRow: {
		marginTop: Spacing.one,
	},
	label: {
		width: 64,
	},
	kmCell: {
		minWidth: 70,
		fontVariant: ['tabular-nums'],
	},
	gainCell: {
		fontVariant: ['tabular-nums'],
		fontWeight: '600',
	},
	summitEmpty: {
		flex: 1,
	},
	summitName: {
		paddingLeft: 64 + Spacing.three,
	},
});
