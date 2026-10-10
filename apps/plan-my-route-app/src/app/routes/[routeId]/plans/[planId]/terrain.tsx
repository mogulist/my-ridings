import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useCurrentLocationKm } from "@/hooks/use-current-location-km";
import { usePlanDetailQuery } from "@/features/plan-my-route/plan-detail-query";
import {
	buildRideTerrainBriefing,
	prepareRideTerrainPlan,
} from "@/features/plan-my-route/ride-terrain-data";
import { RideTerrainDetail } from "@/features/plan-my-route/components/ride-terrain-detail";
import { rememberPendingReviewRoute } from "@/features/navigation/pending-review-route";

export default function RideTerrainScreen() {
	const { planId, routeId, dayNumber } = useLocalSearchParams<{
		planId: string;
		routeId: string;
		dayNumber?: string;
	}>();
	const router = useRouter(),
		theme = useTheme();
	const { data, error, isPending, refetch } = usePlanDetailQuery(planId);
	const location = useCurrentLocationKm(data?.trackPoints);
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30000);
		return () => clearInterval(id);
	}, []);
	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED")
			void rememberPendingReviewRoute(`/routes/${routeId}/plans/${planId}/terrain`).then(() =>
				router.replace("/login"),
			);
	}, [error, routeId, planId, router]);
	const plan = useMemo(() => (data ? prepareRideTerrainPlan(data) : null), [data]);
	const validLocation =
		location.updatedAt != null && now - location.updatedAt < 120000 && !location.error;
	const previewIndex =
		Number.isInteger(Number(dayNumber)) && Number(dayNumber) > 0 ? Number(dayNumber) - 1 : 0;
	const briefing = plan
		? buildRideTerrainBriefing(plan, validLocation ? location.currentKm : null, previewIndex)
		: null;
	return (
		<ScrollView
			keyboardShouldPersistTaps="handled"
			automaticallyAdjustKeyboardInsets
			contentInsetAdjustmentBehavior="automatic"
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 24,
				paddingBottom: 48,
				maxWidth: 650,
				width: "100%",
				alignSelf: "center",
				gap: 18,
			}}
		>
			{isPending ? (
				<ActivityIndicator accessibilityLabel="지형 정보 불러오는 중" />
			) : briefing ? (
				<RideTerrainDetail
					briefing={briefing}
					statusLabel={
						validLocation
							? `${new Date(location.updatedAt!).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 위치 기준`
							: (location.error ?? "위치 확인 전")
					}
				/>
			) : (
				<>
					<ThemedText type="headline">
						{error ? "정보를 불러오지 못했습니다" : "이 위치의 스테이지를 찾지 못했습니다"}
					</ThemedText>
					<ThemedText type="small" themeColor="textSecondary">
						{error
							? "연결을 확인하고 다시 시도해 주세요."
							: "경로로 돌아오거나 일정을 확인해 주세요."}
					</ThemedText>
				</>
			)}
			<Pressable
				onPress={() => {
					void location.refresh();
					void refetch();
				}}
				style={{ minHeight: 48, justifyContent: "center" }}
			>
				<ThemedText type="linkPrimary">위치와 정보 갱신</ThemedText>
			</Pressable>
		</ScrollView>
	);
}
