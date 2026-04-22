import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { AppIcon } from "@/components/ui/icon";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function StageEditScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const { dayNumber } = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const dayLabel = dayNumber ? `D${dayNumber}` : "스테이지";

	useLayoutEffect(() => {
		navigation.setOptions({
			title: `${dayLabel} 편집`,
			headerLeft: () => (
				<HeaderButton
					accessibilityLabel="닫기"
					onPress={() => {
						router.back();
					}}
				>
					<AppIcon name="xmark" size={20} tintColor={theme.tint} />
				</HeaderButton>
			),
		});
	}, [navigation, router, dayLabel, theme.tint]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic"
				>
					<View style={styles.emptyHero}>
						<AppIcon name="square.and.pencil" size={56} tintColor={theme.tint} />
						<ThemedText type="headline" style={styles.emptyTitle}>
							스테이지 편집
						</ThemedText>
						<ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
							메모·POI 편집은 다음 단계에서 연결됩니다.
						</ThemedText>
					</View>

					<View style={styles.sectionGap}>
						<ThemedText type="smallBold" themeColor="textSecondary">
							스테이지 정보
						</ThemedText>
						<Card style={styles.placeholderCard}>
							<ThemedText type="small" themeColor="textSecondary">
								읽기 전용 요약이 여기에 표시됩니다.
							</ThemedText>
						</Card>
					</View>

					<View style={styles.sectionGap}>
						<ThemedText type="smallBold" themeColor="textSecondary">
							스테이지 메모
						</ThemedText>
						<Card style={styles.placeholderCard}>
							<ThemedText type="small" themeColor="textSecondary">
								메모 편집은 시트에서 진행합니다.
							</ThemedText>
						</Card>
					</View>

					<View style={styles.sectionGap}>
						<ThemedText type="smallBold" themeColor="textSecondary">
							POI
						</ThemedText>
						<Card style={styles.placeholderCard}>
							<ThemedText type="small" themeColor="textSecondary">
								거리순 POI 목록이 여기에 표시됩니다.
							</ThemedText>
						</Card>
					</View>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "center",
	},
	safeArea: {
		flex: 1,
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingVertical: Spacing.four,
		gap: Spacing.four,
	},
	emptyHero: {
		alignItems: "center",
		gap: Spacing.two,
		paddingVertical: Spacing.five,
	},
	emptyTitle: {
		textAlign: "center",
	},
	emptySub: {
		textAlign: "center",
		maxWidth: 280,
	},
	sectionGap: {
		gap: Spacing.two,
	},
	placeholderCard: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		minHeight: 72,
		justifyContent: "center",
	},
});
