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

							<View style={styles.statsGrid}>
								<StatCard label="총 거리" value={`${stats.totalDistanceKm.toFixed(1)} km`} />
								<StatCard
									label="총 획득고도"
									value={`+${stats.totalElevationGainM.toLocaleString()} m`}
									valueColor={elevationGainColor}
								/>
								<StatCard label="일수" value={`${stats.dayCount}일`} />
								<StatCard label="시작일" value={stats.startDateLabel} />
							</View>
						</>
					)}
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

type StatCardProps = {
	label: string;
	value: string;
	valueColor?: string;
};

function StatCard({ label, value, valueColor }: StatCardProps) {
	return (
		<View style={styles.card}>
			<ThemedText type="small" themeColor="textSecondary">
				{label}
			</ThemedText>
			<ThemedText
				type="smallBold"
				style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
				{value}
			</ThemedText>
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
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.two,
	},
	card: {
		flexBasis: '48%',
		flexGrow: 1,
		minWidth: 140,
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		gap: Spacing.half,
	},
	statValue: {
		fontSize: 18,
		lineHeight: 22,
		fontVariant: ['tabular-nums'],
	},
});

type PlanSummaryStats = {
	totalDistanceKm: number;
	totalElevationGainM: number;
	dayCount: number;
	startDateLabel: string;
};

function computePlanSummaryStats(detail: PlanDetail): PlanSummaryStats {
	const totalDistanceKm = computeTotalDistanceKm(detail);
	const totalElevationGainM = computeTotalElevationGainM(detail);
	const dayCount = detail.stages.length;
	const startDateLabel = formatStartDate(detail.plan.start_date);
	return { totalDistanceKm, totalElevationGainM, dayCount, startDateLabel };
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
