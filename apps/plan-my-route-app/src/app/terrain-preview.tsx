import {
	startTerrainPreviewActivity,
	endTerrainPreviewActivity,
} from "@/features/live-activity/terrain-preview-activity";
import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { RideTerrainDetail } from "@/features/plan-my-route/components/ride-terrain-detail";
import { buildRideTerrainBriefing } from "@/features/plan-my-route/ride-terrain-data";
import { makeTerrainPreviewPlan } from "@/features/plan-my-route/terrain-preview-data";
import { useTheme } from "@/hooks/use-theme";
export default function TerrainPreview() {
	const theme = useTheme();
	const [showControls, setShowControls] = useState(false);
	const [scenario, setScenario] = useState("normal");
	const [km, setKm] = useState<number | null>(1);
	const plan = useMemo(() => makeTerrainPreviewPlan(scenario), [scenario]);
	const briefing = buildRideTerrainBriefing(plan, km)!;
	if (!__DEV__) return null;
	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 24,
				paddingBottom: 48,
				maxWidth: 650,
				width: "100%",
				alignSelf: "center",
				gap: 16,
			}}
		>
			<Stack.Screen options={{ headerShown: true, title: "앞으로의 지형" }} />
			<ThemedText type="caption" themeColor="textSecondary">
				개발용 예시 데이터 · 실제 라이딩 정보가 아닙니다.
			</ThemedText>
			<Pressable
				onPress={() => setShowControls(!showControls)}
				style={{ minHeight: 44, justifyContent: "center" }}
			>
				<ThemedText type="linkPrimary">예시 상태 바꾸기</ThemedText>
			</Pressable>
			{showControls ? (
				<>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						{[
							["normal", "기본"],
							["no-supply", "보급 없음"],
							["flat", "오르막 없음"],
							["empty", "둘 다 없음"],
							["unknown", "고도 누락"],
						].map(([key, label]) => (
							<Pressable
								key={key}
								onPress={() => setScenario(key)}
								style={{
									minHeight: 44,
									paddingHorizontal: 12,
									justifyContent: "center",
									backgroundColor: theme.backgroundElement,
									borderRadius: 8,
								}}
							>
								<ThemedText type="small">{label}</ThemedText>
							</Pressable>
						))}
					</View>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						{[
							[1, "오르막 전"],
							[8, "오르막 중"],
							[16, "보급 통과"],
							[29, "종료 직전"],
							[null, "위치 대기"],
						].map(([value, label]) => (
							<Pressable
								key={String(value)}
								onPress={() => setKm(value as number | null)}
								style={{
									minHeight: 44,
									paddingHorizontal: 12,
									justifyContent: "center",
									backgroundColor: theme.backgroundElement,
									borderRadius: 8,
								}}
							>
								<ThemedText type="small">{label}</ThemedText>
							</Pressable>
						))}
					</View>
				</>
			) : null}
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
				<Pressable
					onPress={() => void startTerrainPreviewActivity(scenario, km)}
					style={{ minHeight: 44, justifyContent: "center" }}
				>
					<ThemedText type="linkPrimary">잠금화면 예시 시작</ThemedText>
				</Pressable>
				<Pressable
					onPress={() => void endTerrainPreviewActivity()}
					style={{ minHeight: 44, justifyContent: "center" }}
				>
					<ThemedText type="linkPrimary">예시 종료</ThemedText>
				</Pressable>
			</View>
			<RideTerrainDetail briefing={briefing} statusLabel="예시 위치 기준" />
		</ScrollView>
	);
}
