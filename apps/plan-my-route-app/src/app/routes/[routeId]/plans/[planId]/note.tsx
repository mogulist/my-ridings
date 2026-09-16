import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import type { RouteDetail } from "@/features/api/plan-my-route";
import {
	routeDetailQueryKey,
	updatePlanReviewNote,
	useRouteDetailQuery,
} from "@/features/plan-my-route/route-detail-query";
import { useTheme } from "@/hooks/use-theme";

const MAX_NOTE_LENGTH = 2000;

export default function PlanReviewNoteScreen() {
	const navigation = useNavigation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const params = useLocalSearchParams<{ routeId?: string; planId?: string }>();
	const routeId = typeof params.routeId === "string" ? params.routeId : undefined;
	const planId = typeof params.planId === "string" ? params.planId : undefined;
	const { data, isPending } = useRouteDetailQuery(routeId);
	const plan = useMemo(() => data?.plans.find((item) => item.id === planId), [data?.plans, planId]);
	const storedNote = plan?.review_note ?? "";
	const [draft, setDraft] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const visibleDraft = draft ?? storedNote;
	const normalizedDraft = visibleDraft.trim();
	const hasChanges = normalizedDraft !== storedNote.trim();

	const save = useCallback(async () => {
		if (!routeId || !planId || !data || isSaving || !hasChanges) return;
		setErrorMessage(null);
		setIsSaving(true);
		try {
			const nextNote = normalizedDraft || null;
			await updatePlanReviewNote(planId, nextNote);
			queryClient.setQueryData<RouteDetail>(routeDetailQueryKey(routeId), {
				...data,
				plans: data.plans.map((item) =>
					item.id === planId ? { ...item, review_note: nextNote } : item,
				),
			});
			router.back();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "메모를 저장하지 못했습니다.");
		} finally {
			setIsSaving(false);
		}
	}, [data, hasChanges, isSaving, normalizedDraft, planId, queryClient, routeId, router]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: plan?.name ? `${plan.name} 메모` : "검토 메모",
			headerRight: () => (
				<HeaderButton
					accessibilityLabel="검토 메모 저장"
					disabled={!hasChanges || isSaving}
					onPress={() => void save()}
				>
					{isSaving ? (
						<ActivityIndicator size="small" color={theme.tint} />
					) : (
						<ThemedText
							type="smallBold"
							style={{ color: hasChanges ? theme.tint : theme.textSecondary }}
						>
							저장
						</ThemedText>
					)}
				</HeaderButton>
			),
		});
	}, [hasChanges, isSaving, navigation, plan?.name, save, theme.textSecondary, theme.tint]);

	return (
		<ThemedView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
				>
					{isPending && !plan ? (
						<View style={styles.loadingRow}>
							<ActivityIndicator color={theme.tint} />
							<ThemedText type="small" themeColor="textSecondary">
								플랜을 불러오는 중…
							</ThemedText>
						</View>
					) : !plan ? (
						<ThemedText type="small" style={{ color: theme.danger }}>
							플랜을 찾지 못했습니다.
						</ThemedText>
					) : (
						<>
							<ThemedText type="small" themeColor="textSecondary">
								이 플랜을 검토하면서 떠오른 변경점이나 장단점을 적어두세요. 데스크탑에서도 같은
								메모를 확인할 수 있습니다.
							</ThemedText>
							<TextInput
								autoFocus
								accessibilityLabel="플랜 검토 메모"
								multiline
								maxLength={MAX_NOTE_LENGTH}
								placeholder="예: 2일차 거리는 좋지만 획득고도가 높음. 3일차 숙박 후보를 다시 확인할 것."
								placeholderTextColor={theme.textSecondary}
								selectionColor={theme.tint}
								style={[
									styles.input,
									{
										backgroundColor: theme.surfaceElevated,
										borderColor: theme.separator,
										color: theme.text,
									},
								]}
								value={visibleDraft}
								onChangeText={(value) => {
									setDraft(value);
									setErrorMessage(null);
								}}
							/>
							<View style={styles.metaRow}>
								<ThemedText type="caption" themeColor="textSecondary">
									{visibleDraft.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()}
								</ThemedText>
								{hasChanges ? (
									<ThemedText type="caption" style={{ color: theme.warning }}>
										저장하지 않은 변경사항
									</ThemedText>
								) : null}
							</View>
							{errorMessage ? (
								<ThemedText selectable type="small" style={{ color: theme.danger }}>
									{errorMessage}
								</ThemedText>
							) : null}
						</>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: Spacing.four, gap: Spacing.three },
	loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
	input: {
		minHeight: 220,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		padding: Spacing.three,
		fontSize: 16,
		lineHeight: 24,
		textAlignVertical: "top",
	},
	metaRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.two },
});
