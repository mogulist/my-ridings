import { stageDayLabel } from '@my-ridings/plan-geometry';
import { HeaderButton } from '@react-navigation/elements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
	fetchPlanDetail,
	type MobilePlanStageRow,
	type PlanDetail,
} from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';
import { useTheme } from '@/hooks/use-theme';

export default function StageDetailScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
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
	const headerTitle = (() => {
		if (isLoading) return '스테이지';
		if (errorMessage) return '스테이지';
		if (!detail || !stage) {
			return `D${dayNumber}`;
		}
		const datePart = stageDayLabel(dayNumber, detail.plan.start_date);
		const headline = datePart ? `D${dayNumber} · ${datePart}` : `D${dayNumber}`;
		const distanceKm = stageDistanceKm(stage);
		const gainM = Math.round(Number(stage.elevation_gain) || 0);
		return `${headline} · ${distanceKm.toFixed(1)} km · ${gainM} m`;
	})();

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

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
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
				) : !stage ? (
					<View style={styles.placeholderBlock}>
						<ThemedText type="small" themeColor="textSecondary">
							해당 일차 스테이지가 없습니다.
						</ThemedText>
					</View>
				) : (
					<View style={styles.placeholderBlock}>
						<ThemedText type="small" themeColor="textSecondary">
							타임라인·고도·HUD는 다음 단계에서 표시됩니다.
						</ThemedText>
					</View>
				)}
			</SafeAreaView>
		</ThemedView>
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
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.four,
		gap: Spacing.two,
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
});

function stageDistanceKm(stage: MobilePlanStageRow): number {
	const startM = stage.start_distance ?? 0;
	const endM = stage.end_distance ?? startM;
	return (endM - startM) / 1000;
}
