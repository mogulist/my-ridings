import { snapPlanPoisToTrack, type PlanPoiSnapInput } from '@my-ridings/plan-geometry';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
	Animated,
	Easing,
	findNodeHandle,
	ScrollView,
	StyleSheet,
	View,
	type RefObject,
} from 'react-native';

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
	/** 스테이지 기준 상대 km (0…스테이지 길이). 없으면 현위치 도트·스크롤 생략 */
	currentRelKm: number | null;
	scrollRef: RefObject<ScrollView | null>;
	scrollContentRef: RefObject<View | null>;
};

const LEFT_KM_WIDTH = 56;
const AXIS_WIDTH = 24;
const DOT_SIZE = 10;
const CURRENT_DOT_SIZE = 14;
const BAR_WIDTH = 2;
const MILESTONE_ROW_MIN_HEIGHT = 44;
const SCROLL_LEAD_PX = 100;
const SCROLL_THROTTLE_MS = 800;

/** 세로 간격은 거리 비례가 아니라 고정(스크롤 부담 완화). 거리 숫자는 좌측 라벨에만 표시 */
const FIXED_SEGMENT_GAP_PX = 10;

export function PlanStageTimelineStatic({
	stage,
	trackPoints,
	planPois,
	currentRelKm,
	scrollRef,
	scrollContentRef,
}: PlanStageTimelineStaticProps) {
	const theme = useTheme();
	const dotRef = useRef<View>(null);
	const pulse = useRef(new Animated.Value(1)).current;
	const lastScrollAtRef = useRef(0);
	const hasAutoScrolledRef = useRef(false);
	const lastThrottledScrollKmRef = useRef<number | null>(null);

	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const stageLenKm = Math.max(stageEndKm - stageStartKm, 0);

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

	const dotCenterY = useMemo(
		() =>
			currentRelKm == null
				? null
				: computeCurrentDotCenterY(milestones, currentRelKm, MILESTONE_ROW_MIN_HEIGHT, FIXED_SEGMENT_GAP_PX),
		[currentRelKm, milestones],
	);

	useEffect(() => {
		if (currentRelKm == null) {
			pulse.setValue(1);
			return;
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, {
					toValue: 1.2,
					duration: 700,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(pulse, {
					toValue: 1,
					duration: 700,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => {
			loop.stop();
		};
	}, [currentRelKm, pulse]);

	useLayoutEffect(() => {
		if (currentRelKm == null) {
			hasAutoScrolledRef.current = false;
			lastThrottledScrollKmRef.current = null;
			return;
		}
		const contentNode = scrollContentRef.current;
		const outer = scrollRef.current;
		if (!contentNode || !outer || dotCenterY == null) return;

		const scrollToMeasured = () => {
			const inner = dotRef.current;
			const anchor = findNodeHandle(contentNode);
			if (!inner || anchor == null) return;

			const now = Date.now();
			const kmDelta =
				lastThrottledScrollKmRef.current == null
					? Infinity
					: Math.abs(currentRelKm - lastThrottledScrollKmRef.current);
			const isFirstReady = !hasAutoScrolledRef.current;
			const throttleOk =
				isFirstReady || now - lastScrollAtRef.current >= SCROLL_THROTTLE_MS || kmDelta >= 1;
			if (!throttleOk) return;

			inner.measureLayout(
				anchor,
				(_x, y) => {
					const dotCenterOffsetY = y + CURRENT_DOT_SIZE / 2;
					const targetY = Math.max(0, dotCenterOffsetY - SCROLL_LEAD_PX);
					outer.scrollTo({
						y: targetY,
						animated: hasAutoScrolledRef.current,
					});
					lastScrollAtRef.current = Date.now();
					hasAutoScrolledRef.current = true;
					lastThrottledScrollKmRef.current = currentRelKm;
				},
				() => {},
			);
		};

		scrollToMeasured();
		requestAnimationFrame(scrollToMeasured);
	}, [currentRelKm, dotCenterY, milestones, scrollContentRef, scrollRef]);

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

				<View style={styles.timelineBody} collapsable={false}>
					{milestones.map((m, index) => {
						const poiPassed =
							m.kind === 'poi' && currentRelKm != null && currentRelKm + 1e-6 >= m.relKm;

						return (
							<View key={m.id}>
								{index > 0 ? (
									<View style={[styles.gapRow, { height: FIXED_SEGMENT_GAP_PX }]}>
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
											poiPassed ? (
												<View style={[styles.poiDot, { backgroundColor: theme.text }]} />
											) : (
												<View
													style={[
														styles.poiDot,
														{
															backgroundColor: 'transparent',
															borderWidth: 2,
															borderColor: theme.text,
														},
													]}
												/>
											)
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

					{currentRelKm != null && dotCenterY != null ? (
						<View
							ref={dotRef}
							pointerEvents="none"
							collapsable={false}
							style={[
								styles.currentDotWrap,
								{
									top: dotCenterY - CURRENT_DOT_SIZE / 2,
									left: LEFT_KM_WIDTH + AXIS_WIDTH / 2 - CURRENT_DOT_SIZE / 2,
								},
							]}>
							<Animated.View
								style={[
									styles.currentDotPulse,
									{
										transform: [{ scale: pulse }],
										backgroundColor: theme.text,
										shadowColor: theme.text,
									},
								]}
							/>
						</View>
					) : null}
				</View>
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
	timelineBody: {
		position: 'relative',
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
	currentDotWrap: {
		position: 'absolute',
		width: CURRENT_DOT_SIZE,
		height: CURRENT_DOT_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	currentDotPulse: {
		width: CURRENT_DOT_SIZE,
		height: CURRENT_DOT_SIZE,
		borderRadius: CURRENT_DOT_SIZE / 2,
		opacity: 0.95,
		shadowOpacity: 0.35,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 0 },
	},
});

function formatStageKm(relKm: number): string {
	const rounded = Math.round(relKm * 10) / 10;
	const n = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${n}km`;
}

type MilestoneRow = {
	relKm: number;
};

function computeCurrentDotCenterY(
	milestones: MilestoneRow[],
	currentRelKm: number,
	rowHeight: number,
	gapPx: number,
): number | null {
	const n = milestones.length;
	if (n === 0) return null;
	if (n === 1) return rowHeight / 2;

	const centers: number[] = [];
	let y = 0;
	for (let i = 0; i < n; i++) {
		if (i > 0) y += gapPx;
		centers.push(y + rowHeight / 2);
		y += rowHeight;
	}

	const firstKm = milestones[0].relKm;
	const lastKm = milestones[n - 1].relKm;
	const clampedKm = Math.min(Math.max(currentRelKm, firstKm), lastKm);

	if (clampedKm <= firstKm) return centers[0];
	if (clampedKm >= lastKm) return centers[n - 1];

	for (let i = 0; i < n - 1; i++) {
		const k0 = milestones[i].relKm;
		const k1 = milestones[i + 1].relKm;
		if (clampedKm >= k0 && clampedKm <= k1) {
			const span = k1 - k0;
			const t = span > 1e-9 ? (clampedKm - k0) / span : 0;
			return centers[i] + t * (centers[i + 1] - centers[i]);
		}
	}

	return centers[n - 1];
}
