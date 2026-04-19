import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

/** 플로팅 pill·탭바와 겹치지 않도록 하단 여백 */
const FLOATING_TAB_BAR_CLEARANCE = 96;

export default function PlanSummaryScreen() {
	const router = useRouter();
	const { planId } = useLocalSearchParams<{ planId: string }>();
	const apiOrigin = useMemo(getApiOrigin, []);
	const colorScheme = useColorScheme();
	const elevationGainColor = colorScheme === 'dark' ? '#4ade80' : '#15803d';

	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [detail, setDetail] = useState<PlanDetail | null>(null);
	const [retryNonce, setRetryNonce] = useState(0);

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

	const handleRetry = () => {
		setRetryNonce((n) => n + 1);
	};

	const stats = useMemo(() => (detail ? computePlanSummaryStats(detail) : null), [detail]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic">
					<ThemedText type="subtitle">요약</ThemedText>

					{isLoading ? (
						<View style={styles.loadingBlock}>
							<ActivityIndicator accessibilityLabel="요약 불러오는 중" />
							<ThemedText type="small" themeColor="textSecondary">
								플랜 정보를 불러오는 중…
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
					) : !detail || !stats ? (
						<View style={styles.placeholderBlock}>
							<ThemedText type="small" themeColor="textSecondary">
								표시할 요약 데이터가 없습니다.
							</ThemedText>
						</View>
					) : (
						<>
							{detail.plan.name ? (
								<ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
									{detail.plan.name}
								</ThemedText>
							) : null}

							<SectionPlaceholder
								title="스테이지 요약"
								description="일자별 카드 요약(가로 스크롤)을 곧 추가합니다."
							/>

							<SectionPlaceholder
								title="전체 고도 프로필"
								description="플랜 전체 고도 곡선(mini)을 곧 추가합니다."
							/>

							<KeyStatsSection stats={stats} elevationGainColor={elevationGainColor} />

							<SectionPlaceholder
								title="루트 설명"
								description="루트 설명 텍스트 영역을 곧 추가합니다."
							/>
						</>
					)}
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

type KeyStatRow = {
	label: string;
	value: string;
	sub: string;
	emphasizeColor?: string;
};

type KeyStatsSectionProps = {
	stats: PlanSummaryStats;
	elevationGainColor: string;
};

function KeyStatsSection({ stats, elevationGainColor }: KeyStatsSectionProps) {
	const rows: KeyStatRow[] = [
		{
			label: '전체 거리',
			value: `${Math.round(stats.totalDistanceKm).toLocaleString()} km`,
			sub: '총 라이딩 거리',
		},
		{
			label: '전체 획득고도',
			value: `+${stats.totalElevationGainM.toLocaleString()} m`,
			sub: '누적 상승고도',
			emphasizeColor: elevationGainColor,
		},
		{
			label: '최고 고도',
			value: stats.maxElevationM != null ? `${stats.maxElevationM.toLocaleString()} m` : '—',
			sub: stats.maxElevationM != null ? '트랙 기준 최고점' : '트랙 미로드',
		},
		{
			label: '일평균 거리',
			value: `${stats.avgDailyKm.toLocaleString()} km`,
			sub: '하루 평균',
		},
		{
			label: '일평균 획득고도',
			value: `+${stats.avgDailyElevationGainM.toLocaleString()} m`,
			sub: '하루 평균 상승',
			emphasizeColor: elevationGainColor,
		},
		{
			label: '가장 힘든 날',
			value: stats.hardestDay ? `Day ${stats.hardestDay.dayNumber}` : '—',
			sub: stats.hardestDay
				? `+${Math.round(stats.hardestDay.elevationGainM).toLocaleString()} m`
				: '스테이지 없음',
		},
		{
			label: '가장 긴 날',
			value: stats.longestDay ? `${stats.longestDay.distanceKm.toFixed(1)} km` : '—',
			sub: stats.longestDay ? `Day ${stats.longestDay.dayNumber}` : '스테이지 없음',
		},
		{
			label: '시작일',
			value: stats.startDateLabel,
			sub: `${stats.dayCount}일 일정`,
		},
	];

	return (
		<View style={styles.section}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				핵심 통계
			</ThemedText>
			<View style={styles.statsCard}>
				{rows.map((r, i) => (
					<View
						key={r.label}
						style={[styles.statRow, i < rows.length - 1 ? styles.statRowDivider : null]}>
						<ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
							{r.label}
						</ThemedText>
						<View style={styles.statRight}>
							<ThemedText
								type="smallBold"
								style={[
									styles.statValue,
									r.emphasizeColor ? { color: r.emphasizeColor } : null,
								]}>
								{r.value}
							</ThemedText>
							<ThemedText type="small" themeColor="textSecondary" style={styles.statSub}>
								{r.sub}
							</ThemedText>
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

type SectionPlaceholderProps = {
	title: string;
	description: string;
};

function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
	return (
		<View style={styles.section}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				{title}
			</ThemedText>
			<View style={styles.placeholderCard}>
				<ThemedText type="small" themeColor="textSecondary">
					{description}
				</ThemedText>
			</View>
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
		paddingBottom: Spacing.four + FLOATING_TAB_BAR_CLEARANCE,
		gap: Spacing.three,
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
	section: {
		gap: Spacing.two,
	},
	sectionTitle: {
		marginBottom: Spacing.half,
	},
	statsCard: {
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		overflow: 'hidden',
	},
	statRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two + 2,
		gap: Spacing.three,
	},
	statRowDivider: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#A0A4AE',
	},
	statLabel: {
		flex: 1,
	},
	statRight: {
		alignItems: 'flex-end',
		gap: 2,
	},
	statValue: {
		fontVariant: ['tabular-nums'],
	},
	statSub: {
		fontVariant: ['tabular-nums'],
	},
	placeholderCard: {
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		minHeight: 64,
		justifyContent: 'center',
	},
});

type PlanSummaryStats = {
	totalDistanceKm: number;
	totalElevationGainM: number;
	dayCount: number;
	startDateLabel: string;
	maxElevationM: number | null;
	avgDailyKm: number;
	avgDailyElevationGainM: number;
	hardestDay: { dayNumber: number; elevationGainM: number } | null;
	longestDay: { dayNumber: number; distanceKm: number } | null;
};

function computePlanSummaryStats(detail: PlanDetail): PlanSummaryStats {
	const totalDistanceKm = computeTotalDistanceKm(detail);
	const totalElevationGainM = computeTotalElevationGainM(detail);
	const dayCount = detail.stages.length;
	const startDateLabel = formatStartDate(detail.plan.start_date);
	const maxElevationM = computeMaxElevationM(detail.trackPoints);
	const avgDailyKm = dayCount > 0 ? Math.round(totalDistanceKm / dayCount) : 0;
	const avgDailyElevationGainM = dayCount > 0 ? Math.round(totalElevationGainM / dayCount) : 0;

	const hardestDay = pickHardestDay(detail.stages);
	const longestDay = pickLongestDay(detail.stages);

	return {
		totalDistanceKm,
		totalElevationGainM,
		dayCount,
		startDateLabel,
		maxElevationM,
		avgDailyKm,
		avgDailyElevationGainM,
		hardestDay,
		longestDay,
	};
}

function computeTotalDistanceKm(detail: PlanDetail): number {
	const routeM = Number(detail.route.total_distance);
	if (Number.isFinite(routeM) && routeM > 0) return routeM / 1000;
	const lastStage = detail.stages[detail.stages.length - 1];
	const lastEndM = Number(lastStage?.end_distance);
	return Number.isFinite(lastEndM) && lastEndM > 0 ? lastEndM / 1000 : 0;
}

function computeTotalElevationGainM(detail: PlanDetail): number {
	const routeGain = Number(detail.route.elevation_gain);
	if (Number.isFinite(routeGain) && routeGain > 0) return Math.round(routeGain);
	const known = Number(detail.knownRouteElevationGainM);
	if (Number.isFinite(known) && known > 0) return Math.round(known);
	const sum = detail.stages.reduce((acc: number, s: MobilePlanStageRow) => {
		const v = Number(s.elevation_gain);
		return acc + (Number.isFinite(v) ? v : 0);
	}, 0);
	return Math.round(sum);
}

function computeMaxElevationM(trackPoints: TrackPoint[]): number | null {
	let max = -Infinity;
	for (const p of trackPoints) {
		if (p.e != null && p.e > max) max = p.e;
	}
	return Number.isFinite(max) ? Math.round(max) : null;
}

function pickHardestDay(
	stages: MobilePlanStageRow[],
): { dayNumber: number; elevationGainM: number } | null {
	if (stages.length === 0) return null;
	let bestIdx = 0;
	let bestGain = -Infinity;
	for (let i = 0; i < stages.length; i++) {
		const v = Number(stages[i].elevation_gain);
		const g = Number.isFinite(v) ? v : 0;
		if (g > bestGain) {
			bestGain = g;
			bestIdx = i;
		}
	}
	return { dayNumber: bestIdx + 1, elevationGainM: Math.round(bestGain) };
}

function pickLongestDay(
	stages: MobilePlanStageRow[],
): { dayNumber: number; distanceKm: number } | null {
	if (stages.length === 0) return null;
	let bestIdx = 0;
	let bestKm = -Infinity;
	for (let i = 0; i < stages.length; i++) {
		const startM = Number(stages[i].start_distance);
		const endM = Number(stages[i].end_distance);
		const km =
			Number.isFinite(startM) && Number.isFinite(endM) ? Math.max(0, (endM - startM) / 1000) : 0;
		if (km > bestKm) {
			bestKm = km;
			bestIdx = i;
		}
	}
	return { dayNumber: bestIdx + 1, distanceKm: bestKm };
}

function formatStartDate(input: string | null | undefined): string {
	if (!input) return '미정';
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
	if (!m) return input;
	const yyyy = Number(m[1]);
	const mm = Number(m[2]);
	const dd = Number(m[3]);
	const date = new Date(yyyy, mm - 1, dd);
	const dayKor = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] ?? '';
	return `${yyyy}.${String(mm).padStart(2, '0')}.${String(dd).padStart(2, '0')} (${dayKor})`;
}
