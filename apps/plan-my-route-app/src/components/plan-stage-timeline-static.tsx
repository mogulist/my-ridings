import { snapPlanPoisToTrack, type PlanPoiSnapInput } from '@my-ridings/plan-geometry';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
	Animated,
	Easing,
	ScrollView,
	StyleSheet,
	View,
	type RefObject,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type {
	CpMarkerOnRoute,
	MobilePlanStageRow,
	PlanPoiRow,
	SummitMarkerOnRoute,
	TrackPoint,
} from '@/features/api/plan-my-route';
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

type TimelineKind = 'start' | 'poi' | 'cp' | 'summit' | 'end' | 'current';

const CP_LABEL_KO = '체크포인트';
const SUMMIT_LABEL_KO = '정상';

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
	cpMarkers: CpMarkerOnRoute[];
	summitMarkers: SummitMarkerOnRoute[];
	/** 스테이지 기준 상대 km (0…스테이지 길이). 없으면 현위치 행·스크롤 생략 */
	currentRelKm: number | null;
	scrollRef: RefObject<ScrollView | null>;
};

const LEFT_KM_WIDTH = 56;
const AXIS_WIDTH = 24;
const DOT_SIZE = 10;
const CURRENT_DOT_SIZE = 14;
const BAR_WIDTH = 2;
const SCROLL_LEAD_PX = 100;
const SCROLL_THROTTLE_MS = 800;

/** 세로 간격은 거리 비례가 아니라 고정(스크롤 부담 완화). 거리 숫자는 좌측 라벨에만 표시 */
const FIXED_SEGMENT_GAP_PX = 10;

export function PlanStageTimelineStatic({
	stage,
	trackPoints,
	planPois,
	cpMarkers,
	summitMarkers,
	currentRelKm,
	scrollRef,
}: PlanStageTimelineStaticProps) {
	const theme = useTheme();
	const pulse = useRef(new Animated.Value(1)).current;
	const currentRowRef = useRef<View>(null);
	const lastScrollAtRef = useRef(0);
	const hasAutoScrolledRef = useRef(false);
	const lastScrollKmRef = useRef<number | null>(null);

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

		const cpRows: TimelineMilestone[] = cpMarkers
			.filter((c) => c.distanceKm >= stageStartKm && c.distanceKm <= stageEndKm)
			.map((c) => ({
				id: `cp-${c.id}`,
				kind: 'cp' as const,
				relKm: Math.max(0, c.distanceKm - stageStartKm),
				title: c.name?.trim() || CP_LABEL_KO,
				sub: `${CP_LABEL_KO} · ${Math.round(c.elevation).toLocaleString()} m`,
			}));

		const summitRows: TimelineMilestone[] = summitMarkers
			.filter((s) => s.distanceKm >= stageStartKm && s.distanceKm <= stageEndKm)
			.map((s) => ({
				id: `summit-${s.id}`,
				kind: 'summit' as const,
				relKm: Math.max(0, s.distanceKm - stageStartKm),
				title: s.name?.trim() || SUMMIT_LABEL_KO,
				sub: `${SUMMIT_LABEL_KO} · ${Math.round(s.elevation).toLocaleString()} m`,
			}));

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
			...cpRows,
			...summitRows,
			{
				id: 'end',
				kind: 'end',
				relKm: stageLenKm,
				title: endTitle,
				sub: '종료',
			},
		];

		if (currentRelKm != null) {
			rows.push({
				id: 'current',
				kind: 'current',
				relKm: Math.min(Math.max(currentRelKm, 0), stageLenKm),
				title: '현재 위치',
			});
		}

		rows.sort((a, b) => {
			const d = a.relKm - b.relKm;
			if (d !== 0) return d;
			return kindOrder(a.kind) - kindOrder(b.kind);
		});

		return rows;
	}, [
		cpMarkers,
		currentRelKm,
		planPois,
		stage.end_name,
		stage.start_name,
		stageEndKm,
		stageLenKm,
		stageStartKm,
		summitMarkers,
		trackPoints,
	]);

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
			lastScrollKmRef.current = null;
		}
	}, [currentRelKm]);

	const handleCurrentRowLayout = () => {
		maybeAutoScroll({
			scrollRef,
			currentRowRef,
			currentRelKm,
			lastScrollAtRef,
			hasAutoScrolledRef,
			lastScrollKmRef,
		});
	};

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
						const isWaypoint = m.kind === 'poi' || m.kind === 'cp' || m.kind === 'summit';
						const passed =
							isWaypoint && currentRelKm != null && currentRelKm + 1e-6 >= m.relKm;

						return (
							<View
								key={m.id}
								ref={m.kind === 'current' ? currentRowRef : undefined}
								onLayout={m.kind === 'current' ? handleCurrentRowLayout : undefined}>
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
										{m.kind === 'cp' ? (
											<View
												style={[
													styles.cpDot,
													passed
														? { backgroundColor: theme.text }
														: {
																backgroundColor: 'transparent',
																borderWidth: 2,
																borderColor: theme.text,
														  },
												]}
											/>
										) : m.kind === 'summit' ? (
											<View
												style={[
													styles.summitDot,
													{ borderBottomColor: theme.text, opacity: passed ? 1 : 0.35 },
												]}
											/>
										) : m.kind === 'poi' ? (
											passed ? (
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
										) : m.kind === 'current' ? (
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
	cpDot: {
		width: DOT_SIZE,
		height: DOT_SIZE,
	},
	summitDot: {
		width: 0,
		height: 0,
		borderLeftWidth: DOT_SIZE / 2 + 2,
		borderRightWidth: DOT_SIZE / 2 + 2,
		borderBottomWidth: DOT_SIZE + 2,
		borderLeftColor: 'transparent',
		borderRightColor: 'transparent',
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

function kindOrder(k: TimelineKind): number {
	if (k === 'start') return 0;
	if (k === 'poi') return 1;
	if (k === 'cp') return 2;
	if (k === 'summit') return 3;
	if (k === 'current') return 4;
	return 5;
}

function formatStageKm(relKm: number): string {
	const rounded = Math.round(relKm * 10) / 10;
	const n = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${n}km`;
}

type MaybeAutoScrollArgs = {
	scrollRef: RefObject<ScrollView | null>;
	currentRowRef: RefObject<View | null>;
	currentRelKm: number | null;
	lastScrollAtRef: { current: number };
	hasAutoScrolledRef: { current: boolean };
	lastScrollKmRef: { current: number | null };
};

function maybeAutoScroll({
	scrollRef,
	currentRowRef,
	currentRelKm,
	lastScrollAtRef,
	hasAutoScrolledRef,
	lastScrollKmRef,
}: MaybeAutoScrollArgs) {
	if (currentRelKm == null) return;
	const outer = scrollRef.current;
	const row = currentRowRef.current;
	if (!outer || !row) return;

	const now = Date.now();
	const kmDelta =
		lastScrollKmRef.current == null ? Infinity : Math.abs(currentRelKm - lastScrollKmRef.current);
	const isFirstReady = !hasAutoScrolledRef.current;
	const throttleOk =
		isFirstReady || now - lastScrollAtRef.current >= SCROLL_THROTTLE_MS || kmDelta >= 1;
	if (!throttleOk) return;

	/**
	 * New Architecture 호환: `measureLayout`의 첫 인자는 ref이어야 한다.
	 * ScrollView의 경우 내부 스크롤 콘텐츠 기준 y를 반환하므로 그대로 scrollTo 가능.
	 */
	row.measureLayout(
		outer as unknown as Parameters<View['measureLayout']>[0],
		(_x, y) => {
			outer.scrollTo({
				y: Math.max(0, y - SCROLL_LEAD_PX),
				animated: hasAutoScrolledRef.current,
			});
			lastScrollAtRef.current = Date.now();
			hasAutoScrolledRef.current = true;
			lastScrollKmRef.current = currentRelKm;
		},
		() => {},
	);
}
