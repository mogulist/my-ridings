import { stageDayLabel } from '@my-ridings/plan-geometry';
import { HeaderButton } from '@react-navigation/elements';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { PlanStageHud } from '@/components/plan-stage-hud';
import { PlanStageMiniElevation } from '@/components/plan-stage-mini-elevation';
import { PlanStageTimelineStatic } from '@/components/plan-stage-timeline-static';
import { Snackbar } from '@/components/snackbar';
import { AppIcon } from '@/components/ui/icon';
import { useCurrentLocationKm } from '@/hooks/use-current-location-km';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { MobilePlanStageRow, PlanDetail, TrackPoint } from '@/features/api/plan-my-route';
import { usePlanDetailQuery } from '@/features/plan-my-route/plan-detail-query';
import { useTheme } from '@/hooks/use-theme';

export default function StageDetailScreen() {
	useKeepAwake();
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const { routeId, planId, dayNumber: dayNumberParam } = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const dayNumberParsed = Number.parseInt(dayNumberParam ?? '1', 10);
	const dayNumber =
		Number.isFinite(dayNumberParsed) && dayNumberParsed >= 1 ? dayNumberParsed : 1;

	const { data: detail, error, isPending, refetch } = usePlanDetailQuery(planId);

	const [snackbarMessage, setSnackbarMessage] = useMemo(
		() => [null as string | null, (_: string | null) => {}] as const,
		[],
	);
	const scrollRef = useRef<ScrollView>(null);
	const lastSeenCurrentKmRef = useRef<number | null>(null);

	useEffect(() => {
		if (error?.message === 'UNAUTHENTICATED') {
			router.replace('/login');
		}
	}, [error, router]);

	const errorMessage = !planId
		? 'planId가 필요합니다.'
		: error && error.message !== 'UNAUTHENTICATED' && !detail
			? error.message
			: null;

	const showLoading = Boolean(planId) && isPending && !detail;

	const stages = detail?.stages ?? [];
	const stage = stages[dayNumber - 1];

	const location = useCurrentLocationKm(detail?.trackPoints ?? null);

	const datePart =
		detail != null ? stageDayLabel(dayNumber, detail.plan.start_date) : '';

	const maxElevationM = useMemo(() => {
		if (!detail?.trackPoints?.length || !stage) return null;
		const startKm = (stage.start_distance ?? 0) / 1000;
		const endKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
		return maxElevationInStageRange(detail.trackPoints, startKm, endKm);
	}, [detail?.trackPoints, stage]);

	const headerTitle =
		datePart.trim() !== ''
			? `스테이지 ${dayNumber} · ${datePart}`
			: `스테이지 ${dayNumber}`;

	useLayoutEffect(() => {
		navigation.setOptions({
			title: headerTitle,
			headerRight: () => (
				<HeaderButton
					accessibilityLabel="스테이지 편집"
					onPress={() => {
						router.push({
							pathname: '/routes/[routeId]/plans/[planId]/stages/[dayNumber]/edit',
							params: {
								routeId: routeId ?? '',
								planId: planId ?? '',
								dayNumber: dayNumberParam ?? '',
							},
						});
					}}>
					<SymbolView
						name={{
							ios: 'square.and.pencil',
							android: 'edit',
							web: 'edit',
						}}
						size={22}
						tintColor={theme.tint}
					/>
				</HeaderButton>
			),
		});
	}, [
		navigation,
		router,
		routeId,
		planId,
		dayNumberParam,
		headerTitle,
		theme.tint,
	]);

	useEffect(() => {
		const km = location.currentKm;
		if (km == null || stage == null) return;
		if (lastSeenCurrentKmRef.current === km) return;
		lastSeenCurrentKmRef.current = km;

		const startKm = (stage.start_distance ?? 0) / 1000;
		const endKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
		const tolerance = 0.05;
		const isInStage = km >= startKm - tolerance && km <= endKm + tolerance;
		if (!isInStage) {
			void setSnackbarMessage;
		}
	}, [location.currentKm, stage, setSnackbarMessage]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic">
					<View style={styles.scrollInner}>
						{showLoading ? (
							<View style={styles.loadingBlock}>
								<ActivityIndicator accessibilityLabel="스테이지 정보 불러오는 중" color={theme.tint} />
								<ThemedText type="small" themeColor="textSecondary">
									불러오는 중…
								</ThemedText>
							</View>
						) : errorMessage ? (
							<View style={styles.placeholderBlock}>
								<ThemedText type="small" style={{ color: theme.danger }} selectable>
									{errorMessage}
								</ThemedText>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="다시 시도"
									style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
									onPress={() => void refetch()}>
									<ThemedText type="smallBold">다시 시도</ThemedText>
								</Pressable>
							</View>
						) : !(detail && stage) ? (
							<View style={styles.placeholderBlock}>
								<ThemedText type="small" themeColor="textSecondary">
									해당 일차 스테이지가 없습니다.
								</ThemedText>
							</View>
						) : (
							<StageSummaryBody
								detail={detail}
								stage={stage}
								maxElevationM={maxElevationM}
								location={location}
								scrollRef={scrollRef}
							/>
						)}
					</View>
				</ScrollView>
				<Snackbar
					message={snackbarMessage}
					onDismiss={() => {}}
				/>
			</SafeAreaView>
		</ThemedView>
	);
}

type StageSummaryBodyProps = {
	detail: PlanDetail;
	stage: MobilePlanStageRow;
	maxElevationM: number | null;
	location: ReturnType<typeof useCurrentLocationKm>;
	scrollRef: React.RefObject<ScrollView | null>;
};

function StageSummaryBody({
	detail,
	stage,
	maxElevationM,
	location,
	scrollRef,
}: StageSummaryBodyProps) {
	const theme = useTheme();
	const routeLabel = stageRouteLine(stage);
	const distanceKm = stageDistanceKm(stage);
	const gainM = Math.round(Number(stage.elevation_gain) || 0);
	const memo = stage.memo?.trim() || null;

	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const stageLenKm = Math.max(stageEndKm - stageStartKm, 0);
	const currentRelKm = (() => {
		const km = location.currentKm;
		if (km == null) return null;
		const tolerance = 0.05;
		if (km < stageStartKm - tolerance || km > stageEndKm + tolerance) return null;
		return Math.min(Math.max(km - stageStartKm, 0), stageLenKm);
	})();

	return (
		<>
			{memo ? (
				<ThemedText type="small" themeColor="textSecondary" selectable style={styles.stageMemo}>
					{memo}
				</ThemedText>
			) : null}

			{routeLabel ? (
				<ThemedText type="headline" selectable numberOfLines={2} style={styles.routeLabel}>
					{routeLabel}
				</ThemedText>
			) : null}

			<View style={[styles.metricsRow, { borderColor: theme.separator }]}>
				<View style={styles.metricItem}>
					<AppIcon name="figure.outdoor.cycle" size={18} tintColor={theme.tint} />
					<ThemedText type="metricSm" style={styles.metricNum}>
						{distanceKm.toFixed(1)}
					</ThemedText>
					<ThemedText type="caption" themeColor="textSecondary">
						거리 (km)
					</ThemedText>
				</View>
				<View style={[styles.metricSep, { backgroundColor: theme.separator }]} />
				<View style={styles.metricItem}>
					<AppIcon name="arrow.up.forward" size={18} tintColor={theme.gain} />
					<ThemedText type="metricSm" style={[styles.metricNum, { color: theme.gain }]}>
						+{gainM.toLocaleString()}
					</ThemedText>
					<ThemedText type="caption" themeColor="textSecondary">
						획득고도 (m)
					</ThemedText>
				</View>
				{maxElevationM != null ? (
					<>
						<View style={[styles.metricSep, { backgroundColor: theme.separator }]} />
						<View style={styles.metricItem}>
							<AppIcon name="mountain.2.fill" size={18} tintColor={theme.tint} />
							<ThemedText type="metricSm" style={styles.metricNum}>
								{maxElevationM.toLocaleString()}
							</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary">
								최고 (m)
							</ThemedText>
						</View>
					</>
				) : null}
			</View>

			<CurrentLocationKmLine location={location} />

			<PlanStageMiniElevation
				stage={stage}
				trackPoints={detail.trackPoints}
				currentRelKm={currentRelKm}
			/>

			<PlanStageTimelineStatic
				planPois={detail.planPois}
				cpMarkers={detail.cpMarkers}
				summitMarkers={detail.summitMarkers}
				stage={stage}
				trackPoints={detail.trackPoints}
				currentRelKm={currentRelKm}
				scrollRef={scrollRef}
			/>

			<PlanStageHud
				stage={stage}
				trackPoints={detail.trackPoints}
				summitMarkers={detail.summitMarkers}
				currentRelKm={currentRelKm}
			/>
		</>
	);
}

type CurrentLocationKmLineProps = {
	location: ReturnType<typeof useCurrentLocationKm>;
};

function CurrentLocationKmLine({ location }: CurrentLocationKmLineProps) {
	const theme = useTheme();
	const hasKm = location.currentKm != null;
	const kmText = hasKm
		? `${location.currentKm!.toFixed(1)} km (경로 기준)`
		: '위치 없음';

	return (
		<View style={styles.locationRow}>
			<AppIcon
				name="location.fill"
				size={18}
				tintColor={hasKm ? theme.tint : theme.textSecondary}
			/>
			<ThemedText
				type="small"
				themeColor={hasKm ? 'text' : 'textSecondary'}
				style={styles.locationText}
				numberOfLines={1}>
				{location.permission === 'denied' ? '위치 권한이 거부되어 있어요.' : `현재 ${kmText}`}
			</ThemedText>
			{location.error ? (
				<ThemedText type="caption" style={{ color: theme.danger }}>
					{location.error}
				</ThemedText>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="현재 위치 갱신"
				disabled={!location.canRefresh || location.isRefreshing}
				style={({ pressed }) => [
					styles.locationRefreshPill,
					{ backgroundColor: `${theme.tint}18` },
					(!location.canRefresh || location.isRefreshing) && styles.locationRefreshButtonDisabled,
					pressed && location.canRefresh && !location.isRefreshing && styles.pressed,
				]}
				onPress={() => {
					void location.refresh();
				}}>
				<ThemedText type="smallBold" themeColor="tint">
					{location.isRefreshing ? '가져오는 중…' : '갱신'}
				</ThemedText>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
	},
	safeArea: {
		flex: 1,
		width: '100%',
		maxWidth: MaxContentWidth,
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.three,
	},
	scrollInner: {
		gap: Spacing.three,
	},
	stageMemo: {
		lineHeight: 20,
	},
	routeLabel: {
		marginTop: Spacing.half,
	},
	metricsRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 12,
		borderCurve: 'continuous',
		overflow: 'hidden',
		paddingVertical: Spacing.three,
	},
	metricItem: {
		flex: 1,
		alignItems: 'center',
		gap: Spacing.half,
		minWidth: 0,
	},
	metricSep: {
		width: StyleSheet.hairlineWidth,
		marginVertical: Spacing.one,
	},
	metricNum: {
		fontVariant: ['tabular-nums'],
	},
	loadingBlock: {
		flexDirection: 'row',
		gap: Spacing.two,
		paddingVertical: Spacing.two,
		alignItems: 'center',
	},
	placeholderBlock: {
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	retryButton: {
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
	},
	pressed: {
		opacity: 0.75,
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
		minHeight: 36,
	},
	locationText: {
		flex: 1,
		minWidth: 0,
	},
	locationRefreshPill: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.one,
		borderRadius: Radius.pill,
		borderCurve: 'continuous',
	},
	locationRefreshButtonDisabled: {
		opacity: 0.5,
	},
});

function stageDistanceKm(stage: MobilePlanStageRow): number {
	const startM = stage.start_distance ?? 0;
	const endM = stage.end_distance ?? startM;
	return (endM - startM) / 1000;
}

/** 웹 `MobileSharedPlanStagesTab.maxElevationInStageRange`와 동일 */
function maxElevationInStageRange(
	trackPoints: TrackPoint[],
	startKm: number,
	endKm: number,
): number | null {
	const withEle = trackPoints.filter((p) => p.e != null && p.d != null);
	if (withEle.length === 0) return null;
	let max = -Infinity;
	for (const p of withEle) {
		const km = (p.d as number) / 1000;
		if (km >= startKm && km <= endKm && (p.e as number) > max) max = p.e as number;
	}
	return Number.isFinite(max) ? Math.round(max) : null;
}

/** `StageDetailPanel`과 동일: 출발·도착 이름이 모두 있을 때만 표시 */
function stageRouteLine(stage: MobilePlanStageRow): string | null {
	const startLabel = stage.start_name?.trim();
	const endLabel = stage.end_name?.trim();
	if (startLabel && endLabel) return `${startLabel} → ${endLabel}`;
	return null;
}
