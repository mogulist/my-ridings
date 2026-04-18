import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type DummyStageRow = {
	dayNumber: number;
	titleLine: string;
	distanceKm: string;
	gainM: string;
};

const DUMMY_STAGE_ROWS: DummyStageRow[] = [
	{ dayNumber: 1, titleLine: 'D1 · 4/26 (토)', distanceKm: '150', gainM: '2800' },
	{ dayNumber: 2, titleLine: 'D2 · 4/27 (일)', distanceKm: '138', gainM: '2650' },
	{ dayNumber: 3, titleLine: 'D3 · 4/28 (월)', distanceKm: '142', gainM: '2850' },
];

/** 플로팅 pill·탭바와 겹치지 않도록 하단 여백 */
const FLOATING_TAB_BAR_CLEARANCE = 96;

export default function PlanScheduleScreen() {
	const router = useRouter();
	const { routeId, planId } = useLocalSearchParams<{ routeId: string; planId: string }>();

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic">
					<ThemedText type="subtitle">일정</ThemedText>
					<ThemedText type="small" themeColor="textSecondary">
						임시 더미입니다. 카드를 탭하면 스테이지 상세로 들어가며, 상세 화면 네비 바 오른쪽의 「편집」으로 모달을 열 수 있습니다.
					</ThemedText>

					{DUMMY_STAGE_ROWS.map((row) => (
						<Pressable
							key={row.dayNumber}
							accessibilityRole="button"
							accessibilityLabel={`${row.titleLine} 스테이지 상세`}
							style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
							onPress={() => {
								router.push({
									pathname: '/routes/[routeId]/plans/[planId]/stages/[dayNumber]',
									params: {
										routeId: routeId ?? '',
										planId: planId ?? '',
										dayNumber: String(row.dayNumber),
									},
								});
							}}>
							<ThemedText type="smallBold">{row.titleLine}</ThemedText>
							<ThemedText type="small" themeColor="textSecondary">
								{row.distanceKm} km · 획득 {row.gainM} m
							</ThemedText>
						</Pressable>
					))}
				</ScrollView>
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
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.four,
		paddingBottom: Spacing.four + FLOATING_TAB_BAR_CLEARANCE,
		gap: Spacing.two,
	},
	card: {
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		gap: Spacing.half,
	},
	cardPressed: {
		opacity: 0.75,
	},
});
