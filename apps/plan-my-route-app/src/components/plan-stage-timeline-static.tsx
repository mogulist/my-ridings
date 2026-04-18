import { snapPlanPoisToTrack, type PlanPoiSnapInput } from '@my-ridings/plan-geometry';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MobilePlanStageRow, PlanPoiRow, TrackPoint } from '@/features/api/plan-my-route';
import { useTheme } from '@/hooks/use-theme';

/** 웹 `PoiEditDialog` / 공유 탭과 동일 라벨 세트 */
const POI_TYPE_LABEL_KO: Record<string, string> = {
	convenience: '편의점',
	mart: '마트',
	accommodation: '숙소',
	cafe: '카페',
	restaurant: '식당',
};

function poiTypeLabel(poiType: string): string {
	return POI_TYPE_LABEL_KO[poiType] ?? poiType;
}

type TimelineKind = 'start' | 'poi' | 'end';

type TimelineMilestone = {
	id: string;
	kind: TimelineKind;
	relKm: number;
	title: string;
	sub?: string;
};

export type PlanStageTimelineStaticProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	planPois: PlanPoiRow[];
};

const LEFT_KM_WIDTH = 56;
const AXIS_WIDTH = 24;
const DOT_SIZE = 10;
const BAR_WIDTH = 2;

export function PlanStageTimelineStatic({
	stage,
	trackPoints,
	planPois,
}: PlanStageTimelineStaticProps) {
	const theme = useTheme();
	const { height: windowHeight } = useWindowDimensions();

	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const stageLenKm = Math.max(stageEndKm - stageStartKm, 0);

	const pxPerKm = useMemo(() => {
		const denom = Math.max(stageLenKm, 0.001);
		return Math.max(4, windowHeight / denom);
	}, [stageLenKm, windowHeight]);

	const milestones = useMemo(() => {
		const snapped =
			trackPoints.length > 0
				? snapPlanPoisToTrack(planPois as PlanPoiSnapInput[], trackPoints)
				: [];

		const inStage = snapped.filter(
			(p) => p.distanceKm >= stageStartKm && p.distanceKm <= stageEndKm,
		);

		const startTitle = stage.start_name?.trim() ?? '출발';
		const endTitle = stage.end_name?.trim() ?? '도착';

		const rows: TimelineMilestone[] = [
			{
				id: 'start',
				kind: 'start',
				relKm: 0,
				title: startTitle,
				sub: '시작',
			},
			...inStage.map((p) => ({
				id: `poi-${p.id}`,
				kind: 'poi' as const,
				relKm: Math.max(0, p.distanceKm - stageStartKm),
				title: p.name?.trim() || 'POI',
				sub: poiTypeLabel(p.poiType),
			})),
			{
				id: 'end',
				kind: 'end',
				relKm: stageLenKm,
				title: endTitle,
				sub: '종료',
			},
		];

		rows.sort((a, b) => {
			const d = a.relKm - b.relKm;
			if (d !== 0) return d;
			const order = (k: TimelineKind) => (k === 'start' ? 0 : k === 'poi' ? 1 : 2);
			return order(a.kind) - order(b.kind);
		});

		return rows;
	}, [planPois, stage.end_name, stage.start_name, stageEndKm, stageLenKm, stageStartKm, trackPoints]);

	return (
		<View style={styles.wrap}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				타임라인
			</ThemedText>
			<View style={styles.card}>
				<View style={styles.columnHeader}>
					<ThemedText
						type="small"
						themeColor="textSecondary"
						style={[styles.leftColHeader, { width: LEFT_KM_WIDTH }]}>
						거리
					</ThemedText>
					<View style={{ width: AXIS_WIDTH }} />
					<ThemedText type="small" themeColor="textSecondary" style={styles.rightColHeader}>
						일정
					</ThemedText>
				</View>

				{milestones.map((m, index) => {
					const prev = milestones[index - 1];
					const gapKm = prev ? Math.max(0, m.relKm - prev.relKm) : 0;
					const spacerH = gapKm * pxPerKm;

					return (
						<View key={m.id}>
							{index > 0 ? (
								<View style={[styles.gapRow, { height: spacerH }]}>
									<View style={{ width: LEFT_KM_WIDTH }} />
									<View style={[styles.axisSlot, { width: AXIS_WIDTH }]}>
										<View style={styles.axisSegment} />
									</View>
									<View style={styles.flex1} />
								</View>
							) : null}

							<View style={styles.milestoneRow}>
								<ThemedText
									type="small"
									style={[styles.kmCell, { width: LEFT_KM_WIDTH, color: theme.text }]}>
									{formatStageKm(m.relKm)}
								</ThemedText>

								<View style={[styles.axisSlot, { width: AXIS_WIDTH }]}>
									{m.kind === 'poi' ? (
										<View style={[styles.poiDot, { backgroundColor: theme.text }]} />
									) : (
										<View style={[styles.endpointBar, { backgroundColor: theme.text }]} />
									)}
								</View>

								<View style={styles.labelBlock}>
									<ThemedText type="smallBold" numberOfLines={2}>
										{m.title}
									</ThemedText>
									{m.sub ? (
										<ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
											{m.sub}
										</ThemedText>
									) : null}
								</View>
							</View>
						</View>
					);
				})}
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
		gap: 0,
	},
	columnHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: Spacing.two,
	},
	leftColHeader: {
		textAlign: 'right',
		paddingRight: Spacing.one,
	},
	rightColHeader: {
		flex: 1,
		paddingLeft: Spacing.two,
	},
	gapRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	axisSlot: {
		alignItems: 'center',
	},
	axisSegment: {
		width: BAR_WIDTH,
		flex: 1,
		borderRadius: 1,
		backgroundColor: '#A0A4AE',
		opacity: 0.45,
	},
	flex1: {
		flex: 1,
	},
	milestoneRow: {
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 44,
	},
	kmCell: {
		textAlign: 'right',
		paddingRight: Spacing.one,
		fontVariant: ['tabular-nums'],
		fontSize: 13,
		lineHeight: 18,
	},
	poiDot: {
		width: DOT_SIZE,
		height: DOT_SIZE,
		borderRadius: DOT_SIZE / 2,
	},
	endpointBar: {
		width: BAR_WIDTH,
		height: 14,
		borderRadius: 1,
	},
	labelBlock: {
		flex: 1,
		paddingLeft: Spacing.two,
		minWidth: 0,
		gap: 2,
	},
});

function formatStageKm(relKm: number): string {
	const rounded = Math.round(relKm * 10) / 10;
	const n = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${n}km`;
}
