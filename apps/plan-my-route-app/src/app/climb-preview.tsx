import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { makeTerrainPreviewPlan } from "@/features/plan-my-route/terrain-preview-data";
import { recommendClimbs } from "@/features/plan-my-route/climb-recommendations";
import { ClimbRecommendationList } from "@/features/plan-my-route/components/climb-recommendation-list";
export default function ClimbPreview() {
	const theme = useTheme();
	const plan = useMemo(() => makeTerrainPreviewPlan("normal"), []),
		[excluded, setExcluded] = useState<string[]>([]),
		[saved, setSaved] = useState<string[]>([]);
	const stage = {
		id: "p",
		start_distance: 0,
		end_distance: 30000,
		title: null,
		memo: null,
		start_name: null,
		end_name: null,
		elevation_gain: null,
		elevation_loss: null,
	};
	const candidates = recommendClimbs(
		plan.terrain,
		stage,
		plan.track,
		[],
		[],
		[
			{
				id: "11111111-1111-4111-8111-111111111111",
				name: "기존 솔재",
				lat: 37,
				lng: 127.1,
				elevation_m: 300,
			},
		],
		[...excluded, ...saved],
	);
	if (!__DEV__) return null;
	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			automaticallyAdjustKeyboardInsets
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 18 }}
		>
			<Stack.Screen options={{ title: "오르막 스캔 예시" }} />
			<ThemedText type="caption">가상 예시 · 등록은 이 화면에서만 재현됩니다.</ThemedText>
			<ClimbRecommendationList
				candidates={candidates}
				hasExcluded={excluded.length > 0}
				onExclude={(id) => setExcluded([...excluded, id])}
				onReset={() => setExcluded([])}
				onSave={async (item) => setSaved([...saved, item.climb.id])}
			/>
		</ScrollView>
	);
}
