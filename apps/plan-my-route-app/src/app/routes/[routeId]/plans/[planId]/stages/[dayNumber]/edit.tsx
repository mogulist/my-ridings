import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { patchPlanPoi, putStage } from "@/features/api/plan-my-route";
import {
	getOrderedPlanPoisInStage,
	StageEditPoiMemoList,
} from "@/features/plan-my-route/components/stage-edit-poi-memo-list";
import { planDetailQueryKey, usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { useTheme } from "@/hooks/use-theme";

export default function StageEditScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { planId, dayNumber } = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const dayNumberParsed = Number.parseInt(dayNumber ?? "1", 10);
	const dayNum = Number.isFinite(dayNumberParsed) && dayNumberParsed >= 1 ? dayNumberParsed : 1;
	const screenTitle = `Stage ${dayNum} 편집`;

	const { data: detail, error, isPending } = usePlanDetailQuery(planId);
	const stage = detail?.stages?.[dayNum - 1];

	const [stageMemoDraft, setStageMemoDraft] = useState("");
	const [poiMemoById, setPoiMemoById] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);
	const syncedStageIdRef = useRef<string | null>(null);

	useEffect(() => {
		syncedStageIdRef.current = null;
	}, [planId, dayNumber]);

	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED") {
			router.replace("/login");
		}
	}, [error, router]);

	useEffect(() => {
		if (!stage || !detail) return;
		if (syncedStageIdRef.current === stage.id) return;
		syncedStageIdRef.current = stage.id;
		setStageMemoDraft(stage.memo ?? "");
		const rows = getOrderedPlanPoisInStage(detail.planPois, detail.trackPoints, stage);
		setPoiMemoById(Object.fromEntries(rows.map(({ poi }) => [poi.id, poi.memo ?? ""])));
	}, [detail, stage]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: screenTitle,
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
	}, [navigation, router, screenTitle, theme.tint]);

	const stageMemoDirty =
		stage != null && stageMemoDraft.trim() !== (stage.memo ?? "").trim();

	const poiRows = detail && stage ? getOrderedPlanPoisInStage(detail.planPois, detail.trackPoints, stage) : [];
	const poiDirty = poiRows.some(
		({ poi }) => (poiMemoById[poi.id] ?? "").trim() !== (poi.memo ?? "").trim(),
	);
	const hasDirty = stageMemoDirty || poiDirty;
	const canSave = Boolean(planId && stage && hasDirty && !isSaving);

	const handleSave = async () => {
		if (!planId || !stage || !detail) return;
		const apiOrigin = getApiOrigin();
		if (!apiOrigin) {
			Alert.alert("오류", "EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
			return;
		}
		const accessToken = await getStoredAccessToken();
		if (!accessToken) {
			router.replace("/login");
			return;
		}

		setIsSaving(true);
		try {
			if (stageMemoDirty) {
				await putStage(apiOrigin, accessToken, stage.id, {
					memo: stageMemoDraft.trim() ? stageMemoDraft.trim() : null,
				});
			}
			for (const { poi } of poiRows) {
				const next = (poiMemoById[poi.id] ?? "").trim();
				const prev = (poi.memo ?? "").trim();
				if (next === prev) continue;
				await patchPlanPoi(apiOrigin, accessToken, planId, poi.id, {
					memo: next ? next : null,
				});
			}
			await queryClient.invalidateQueries({ queryKey: planDetailQueryKey(planId) });
			router.back();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
			Alert.alert("저장 실패", msg);
		} finally {
			setIsSaving(false);
		}
	};

	const errorMessage =
		!planId
			? "planId가 필요합니다."
			: error && error.message !== "UNAUTHENTICATED" && !detail
				? error.message
				: !isPending && detail && !stage
					? "해당 일차 스테이지를 찾을 수 없습니다."
					: null;

	const showLoading = Boolean(planId) && isPending && !detail;

	return (
		<ThemedView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.keyboard}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
					{showLoading ? (
						<View style={styles.stateBlock}>
							<ActivityIndicator accessibilityLabel="불러오는 중" color={theme.tint} />
							<ThemedText type="small" themeColor="textSecondary">
								불러오는 중…
							</ThemedText>
						</View>
					) : errorMessage ? (
						<View style={styles.stateBlock}>
							<ThemedText type="small" style={{ color: theme.danger }} selectable>
								{errorMessage}
							</ThemedText>
						</View>
					) : detail && stage ? (
						<View style={styles.mainColumn}>
							<ScrollView
								style={styles.scroll}
								contentContainerStyle={styles.scrollContent}
								contentInsetAdjustmentBehavior="automatic"
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator
							>
								<View style={styles.sectionGap}>
									<ThemedText type="smallBold" style={styles.sectionTitle}>
										스테이지 메모
									</ThemedText>
									<TextInput
										value={stageMemoDraft}
										onChangeText={setStageMemoDraft}
										placeholder="스테이지 메모"
										placeholderTextColor={theme.textSecondary}
										multiline
										accessibilityLabel="스테이지 메모"
										style={[
											styles.stageMemoInput,
											{
												color: theme.text,
												borderColor: theme.separator,
												backgroundColor: theme.backgroundElement,
											},
										]}
									/>
								</View>

								<View style={styles.sectionGap}>
									<StageEditPoiMemoList
										stage={stage}
										trackPoints={detail.trackPoints}
										planPois={detail.planPois}
										poiMemoById={poiMemoById}
										onChangePoiMemo={(poiId, text) => {
											setPoiMemoById((prev) => ({ ...prev, [poiId]: text }));
										}}
									/>
								</View>
							</ScrollView>

							<View
								style={[
									styles.footer,
									{
										borderTopColor: theme.separator,
										backgroundColor: theme.background,
										paddingBottom: Math.max(insets.bottom, Spacing.three),
									},
								]}
							>
								<PressableHaptic
									accessibilityRole="button"
									accessibilityLabel="저장"
									disabled={!canSave}
									onPress={() => void handleSave()}
									style={[
										styles.saveButton,
										{
											backgroundColor: canSave ? theme.tint : theme.backgroundElement,
											opacity: canSave ? 1 : 0.55,
										},
									]}
								>
									<ThemedText type="smallBold" style={{ color: canSave ? "#fff" : theme.textSecondary }}>
										{isSaving ? "저장 중…" : "저장"}
									</ThemedText>
								</PressableHaptic>
							</View>
						</View>
					) : null}
				</SafeAreaView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "center",
	},
	keyboard: {
		flex: 1,
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	safeArea: {
		flex: 1,
		width: "100%",
	},
	mainColumn: {
		flex: 1,
		minHeight: 0,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.four,
		paddingBottom: Spacing.four,
		gap: Spacing.four,
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.three,
	},
	sectionGap: {
		gap: Spacing.two,
	},
	sectionTitle: {},
	stageMemoInput: {
		alignSelf: "stretch",
		minHeight: 100,
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.two,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		fontSize: 15,
		lineHeight: 22,
		textAlignVertical: "top",
	},
	saveButton: {
		paddingVertical: Spacing.three,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	stateBlock: {
		flex: 1,
		padding: Spacing.four,
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
});
