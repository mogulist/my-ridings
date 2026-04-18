import { HeaderButton } from '@react-navigation/elements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useLayoutEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DUMMY_STAGE_TITLES: Record<string, string> = {
	'1': 'D1 · 4/26 (토) · 150 km · 2800 m',
	'2': 'D2 · 4/27 (일) · 138 km · 2650 m',
	'3': 'D3 · 4/28 (월) · 142 km · 2850 m',
};

export default function StageDetailScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const { routeId, planId, dayNumber } = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const title = DUMMY_STAGE_TITLES[dayNumber ?? ''] ?? `D${dayNumber ?? '?'} 스테이지`;

	useLayoutEffect(() => {
		navigation.setOptions({
			title,
			headerRight: () => (
				<HeaderButton
					accessibilityLabel="스테이지 편집"
					onPress={() => {
						router.push({
							pathname: '/routes/[routeId]/plans/[planId]/stages/[dayNumber]/edit',
							params: {
								routeId: routeId ?? '',
								planId: planId ?? '',
								dayNumber: dayNumber ?? '',
							},
						});
					}}>
					<View style={styles.headerRightRow}>
						{Platform.OS === 'ios' ? (
							<SymbolView
								name="square.and.pencil"
								size={20}
								tintColor={theme.text}
							/>
						) : null}
						<ThemedText type="smallBold">편집</ThemedText>
					</View>
				</HeaderButton>
			),
		});
	}, [navigation, router, routeId, planId, dayNumber, title, theme.text]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText type="subtitle">스테이지 상세</ThemedText>
				<ThemedText type="small" themeColor="textSecondary">
					routeId: {routeId ?? '-'} · planId: {planId ?? '-'} · day: {dayNumber ?? '-'}
				</ThemedText>
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
	headerRightRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
});
