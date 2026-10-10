import { useState } from "react";
import { ScrollView } from "react-native";
import { Stack } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { StageFinishEditor } from "@/features/plan-my-route/components/stage-finish-editor";
import type { MobilePlanStageRow, PlanPoiRow } from "@/features/api/plan-my-route";
const stages: MobilePlanStageRow[] = [0, 1].map((i) => ({
	id: `stage-${i}`,
	title: null,
	start_distance: i * 10000,
	end_distance: (i + 1) * 10000,
	elevation_gain: 100,
	elevation_loss: 0,
	memo: null,
	start_name: null,
	end_name: null,
}));
const track = Array.from({ length: 201 }, (_, i) => ({
	d: i * 100,
	x: 127 + i * 0.001,
	y: 37,
	e: 100 + i,
}));
const poi = {
	id: "p",
	plan_id: "p",
	name: "도착 전 보급",
	lat: 37,
	lng: 127.09,
	assignment_mode: "stage",
	stage_id: "stage-0",
	poi_type: "convenience",
	memo: null,
} as PlanPoiRow;
export default function FinishPreview() {
	const theme = useTheme(),
		[errorOnce, setErrorOnce] = useState(true),
		[saved, setSaved] = useState(false);
	if (!__DEV__) return null;
	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			automaticallyAdjustKeyboardInsets
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 24, gap: 18 }}
		>
			<Stack.Screen options={{ title: "종료 복구 예시" }} />
			<ThemedText type="caption">가상 예시 · GPS 없음 · 첫 저장 실패 후 재시도 재현</ThemedText>
			<StageFinishEditor
				stages={stages}
				stage={stages[0]}
				track={track}
				pois={[poi]}
				currentKm={null}
				onSave={async () => {
					if (errorOnce) {
						setErrorOnce(false);
						throw new Error("예시 연결 오류입니다. 같은 지점으로 다시 시도하세요.");
					}
					setSaved(true);
				}}
			/>
			{saved ? <ThemedText>예시 저장 완료 · 실제 DB 변경 없음</ThemedText> : null}
		</ScrollView>
	);
}
