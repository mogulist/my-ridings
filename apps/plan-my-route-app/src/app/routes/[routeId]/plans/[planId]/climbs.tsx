import { rememberPendingReviewRoute } from "@/features/navigation/pending-review-route";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { analyzeTerrain } from "@my-ridings/plan-geometry";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import { recommendClimbs } from "@/features/plan-my-route/climb-recommendations";
import { ClimbRecommendationList } from "@/features/plan-my-route/components/climb-recommendation-list";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { registerPlanClimb } from "@/features/api/plan-my-route";
export default function ClimbScan() {
	const router = useRouter();
	const { planId, routeId, dayNumber } = useLocalSearchParams<{
		planId: string;
		routeId: string;
		dayNumber: string;
	}>();
	const { data, error, isPending, refetch } = usePlanDetailQuery(planId);
	const theme = useTheme();
	const [excluded, setExcluded] = useState<string[]>([]),
		[loaded, setLoaded] = useState(false);
	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED")
			void rememberPendingReviewRoute(`/routes/${routeId}/plans/${planId}/climbs`).then(() =>
				router.replace("/login"),
			);
	}, [error, routeId, planId, router]);
	const index = Number(dayNumber) - 1,
		stage = data?.stages[Number.isInteger(index) && index >= 0 ? index : 0];
	const key = `climb-excluded:${planId}:${stage?.id ?? ""}`;
	useEffect(() => {
		let active = true;
		setLoaded(false);
		void AsyncStorage.getItem(key)
			.then((value) => {
				let ids: string[] = [];
				try {
					const parsed = JSON.parse(value ?? "[]");
					if (Array.isArray(parsed)) ids = parsed.filter((v) => typeof v === "string");
				} catch {}
				if (active) {
					setExcluded(ids);
					setLoaded(true);
				}
			})
			.catch(() => {
				if (active) {
					setExcluded([]);
					setLoaded(true);
				}
			});
		return () => {
			active = false;
		};
	}, [key]);
	const analysis = useMemo(() => (data ? analyzeTerrain(data.trackPoints) : null), [data]);
	const candidates = useMemo(
		() =>
			data && stage && analysis
				? recommendClimbs(
						analysis,
						stage,
						data.trackPoints,
						data.summitMarkers,
						data.cpMarkers,
						data.officialSummits,
						excluded,
					)
				: [],
		[data, stage, analysis, excluded],
	);
	const updateExcluded = (ids: string[]) => {
		setExcluded(ids);
		void AsyncStorage.setItem(key, JSON.stringify(ids)).catch(() => {});
	};
	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			automaticallyAdjustKeyboardInsets
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 24,
				gap: 18,
				paddingBottom: 48,
				maxWidth: 650,
				width: "100%",
				alignSelf: "center",
			}}
		>
			<Stack.Screen options={{ title: "오르막 스캔" }} />
			{isPending || !loaded ? (
				<ActivityIndicator />
			) : error ? (
				<ThemedText>{error.message}</ThemedText>
			) : stage ? (
				<>
					<ThemedText type="headline">스테이지 {(data?.stages.indexOf(stage) ?? 0) + 1}</ThemedText>
					<ClimbRecommendationList
						candidates={candidates}
						hasExcluded={excluded.length > 0}
						onExclude={(id) => updateExcluded([...excluded, id])}
						onReset={() => updateExcluded([])}
						onSave={async (item, name, summitId) => {
							const origin = getApiOrigin(),
								token = await getStoredAccessToken();
							if (!origin || !token) throw new Error("로그인과 연결을 확인해 주세요.");
							await registerPlanClimb(origin, token, planId, {
								name,
								summitId,
								distanceM: item.climb.summitKm * 1000,
							});
							const result = await refetch();
							if (result.error)
								throw new Error("등록했습니다. 목록을 새로 불러오지 못했으니 다시 열어 주세요.");
						}}
					/>
				</>
			) : (
				<ThemedText>스테이지를 찾지 못했습니다.</ThemedText>
			)}
		</ScrollView>
	);
}
