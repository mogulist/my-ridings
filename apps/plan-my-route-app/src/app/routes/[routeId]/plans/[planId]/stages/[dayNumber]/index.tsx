import { stageDayLabel } from '@my-ridings/plan-geometry';
import { HeaderButton } from '@react-navigation/elements';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { PlanStageHud } from '@/components/plan-stage-hud';
import { PlanStageMiniElevation } from '@/components/plan-stage-mini-elevation';
import { PlanStageTimelineStatic } from '@/components/plan-stage-timeline-static';
import { Snackbar } from '@/components/snackbar';
import { useCurrentLocationKm } from '@/hooks/use-current-location-km';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
	fetchPlanDetail,
	type MobilePlanStageRow,
	type PlanDetail,
	type TrackPoint,
} from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function StageDetailScreen() {
	useKeepAwake();
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const colorScheme = useColorScheme();
	const elevationGainColor =
		colorScheme === 'dark' ? '#4ade80' : '#15803d';
	const { routeId, planId, dayNumber: dayNumberParam } = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const apiOrigin = useMemo(getApiOrigin, []);
	const dayNumberParsed = Number.parseInt(dayNumberParam ?? '1', 10);
	const dayNumber =
		Number.isFinite(dayNumberParsed) && dayNumberParsed >= 1 ? dayNumberParsed : 1;

	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [detail, setDetail] = useState<PlanDetail | null>(null);
	const [retryNonce, setRetryNonce] = useState(0);
	const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
	const scrollRef = useRef<ScrollView>(null);
	const lastSeenCurrentKmRef = useRef<number | null>(null);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			if (!planId) {
				setErrorMessage('planId가 필요합니다.');
				setIsLoading(false);
				return;
			}
			setErrorMessage(null);
			setIsLoading(true);
			try {
				const accessToken = await getStoredAccessToken();
				if (!accessToken) {
					if (isMounted) setIsLoading(false);
					router.replace('/login');
					return;
				}
				if (!apiOrigin) throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');

				const data = await fetchPlanDetail(apiOrigin, accessToken, planId);
				if (!isMounted) return;
				setDetail(data);
			} catch (error: unknown) {
				if (!isMounted) return;
				setDetail(null);
				setErrorMessage(error instanceof Error ? error.message : '플랜을 불러오지 못했습니다.');
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [apiOrigin, planId, router, retryNonce]);

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
						tintColor={theme.text}
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
		theme.text,
	]);

	const handleRetry = () => {
		setRetryNonce((n) => n + 1);
	};

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
			setSnackbarMessage('이 스테이지에 현재 위치가 없습니다.');
		}
	}, [location.currentKm, stage]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic">
					<View style={styles.scrollInner}>
						{isLoading ? (
							<View style={styles.loadingBlock}>
								<ActivityIndicator accessibilityLabel="스테이지 정보 불러오는 중" />
								<ThemedText type="small" themeColor="textSecondary">
									불러오는 중…
								</ThemedText>
							</View>
						) : errorMessage ? (
							<View style={styles.placeholderBlock}>
								<ThemedText type="small" style={styles.errorText}>
									{errorMessage}
								</ThemedText>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="다시 시도"
									style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
									onPress={handleRetry}>
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
								elevationGainColor={elevationGainColor}
								location={location}
								scrollRef={scrollRef}
							/>
						)}
					</View>
				</ScrollView>
				<Snackbar
					message={snackbarMessage}
					onDismiss={() => setSnackbarMessage(null)}
				/>
			</SafeAreaView>
		</ThemedView>
	);
}

type StageSummaryBodyProps = {
	detail: PlanDetail;
	stage: MobilePlanStageRow;
	maxElevationM: number | null;
	elevationGainColor: string;
	location: ReturnType<typeof useCurrentLocationKm>;
	scrollRef: RefObject<ScrollView | null>;
};

function StageSummaryBody({
	detail,
	stage,
	maxElevationM,
	elevationGainColor,
	location,
	scrollRef,
}: StageSummaryBodyProps) {
	const routeLabel = stageRouteLine(stage);
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
			<View style={styles.summaryCard}>
				{routeLabel ? (
					<ThemedText
						type="small"
						themeColor="textSecondary"
						numberOfLines={3}
						style={styles.routeLine}>
						{routeLabel}
					</ThemedText>
				) : null}
				<View style={styles.statsRow}>
					<ThemedText type="smallBold" style={styles.statPrimary}>
						{stageDistanceKm(stage).toFixed(1)} km
					</ThemedText>
					<ThemedText type="small" style={[styles.statGain, { color: elevationGainColor }]}>
						+{Math.round(Number(stage.elevation_gain) || 0).toLocaleString()} m
					</ThemedText>
					<ThemedText type="small" themeColor="textSecondary">
						최고 {maxElevationM != null ? `${maxElevationM.toLocaleString()} m` : '—'}
					</ThemedText>
				</View>
				<CurrentLocationKmLine location={location} />
			</View>
			<PlanStageMiniElevation
				stage={stage}
				trackPoints={detail.trackPoints}
				currentRelKm={currentRelKm}
			/>
			<PlanStageTimelineStatic
				planPois={detail.planPois}
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
	const kmText =
		location.currentKm != null
			? `현재 ${location.currentKm.toFixed(1)} km (경로 기준)`
			: '현재 위치: —';

	return (
		<View style={styles.locationBlock}>
			<ThemedText type="small" themeColor="textSecondary">
				{location.permission === 'denied' ? '위치 권한이 거부되어 있어요.' : kmText}
			</ThemedText>
			{location.error ? (
				<ThemedText type="small" style={styles.errorText}>
					{location.error}
				</ThemedText>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="현재 위치 갱신"
				disabled={!location.canRefresh || location.isRefreshing}
				style={({ pressed }) => [
					styles.locationRefreshButton,
					(!location.canRefresh || location.isRefreshing) && styles.locationRefreshButtonDisabled,
					pressed && location.canRefresh && !location.isRefreshing && styles.pressed,
				]}
				onPress={() => {
					void location.refresh();
				}}>
				{location.isRefreshing ? (
					<ThemedText type="smallBold">가져오는 중…</ThemedText>
				) : (
					<ThemedText type="smallBold">현재 위치 갱신</ThemedText>
				)}
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
		paddingVertical: Spacing.four,
	},
	scrollInner: {
		gap: Spacing.three,
	},
	summaryCard: {
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.two,
	},
	routeLine: {
		lineHeight: 20,
	},
	statsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'baseline',
		columnGap: Spacing.three,
		rowGap: Spacing.one,
	},
	statPrimary: {
		fontVariant: ['tabular-nums'],
	},
	statGain: {
		fontVariant: ['tabular-nums'],
		fontWeight: 600,
	},
	loadingBlock: {
		gap: Spacing.two,
		paddingVertical: Spacing.two,
		alignItems: 'flex-start',
	},
	placeholderBlock: {
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	errorText: {
		color: '#D64545',
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
	locationBlock: {
		gap: Spacing.two,
		marginTop: Spacing.half,
	},
	locationRefreshButton: {
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
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
