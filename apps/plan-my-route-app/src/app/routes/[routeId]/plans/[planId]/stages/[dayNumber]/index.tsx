import { stageDayLabel } from "@my-ridings/plan-geometry";
import { HeaderButton } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlanStageMiniElevation } from "@/components/plan-stage-mini-elevation";
import { PlanStageTimelineStatic } from "@/components/plan-stage-timeline-static";
import { Snackbar } from "@/components/snackbar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import {
	type MobilePlanStageRow,
	patchPlanPoi,
	type PlanDetail,
	putStage,
} from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { RideLiveActivityStatus } from "@/features/live-activity/ride-live-activity-status";
import { pauseRideTracking } from "@/features/live-activity/ride-tracking";
import { getRideTrackingStatus } from "@/features/live-activity/ride-tracking-state";
import { AccommodationChoices } from "@/features/plan-my-route/components/accommodation-choices";
import {
	type StageFocus,
	StageFocusTabs,
} from "@/features/plan-my-route/components/stage-focus-tabs";
import { removeSummitsDuplicatedByCheckpoints } from "@/features/plan-my-route/dedupe-route-markers";
import {
	planDetailQueryKey,
	usePlanDetailQuery,
} from "@/features/plan-my-route/plan-detail-query";
import { buildStageFinishPlan } from "@/features/plan-my-route/stage-finish";
import { useCurrentLocationKm } from "@/hooks/use-current-location-km";
import { useTheme } from "@/hooks/use-theme";

export default function StageDetailScreen() {
	useKeepAwake();
	const navigation = useNavigation();
	const router = useRouter();
	const theme = useTheme();
	const {
		routeId,
		planId,
		dayNumber: dayNumberParam,
	} = useLocalSearchParams<{
		routeId: string;
		planId: string;
		dayNumber: string;
	}>();

	const dayNumberParsed = Number.parseInt(dayNumberParam ?? "1", 10);
	const dayNumber = Number.isFinite(dayNumberParsed) && dayNumberParsed >= 1 ? dayNumberParsed : 1;

	const { data: detail, error, isPending, refetch } = usePlanDetailQuery(planId);

	const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
	const scrollRef = useRef<ScrollView>(null);
	const lastSeenCurrentKmRef = useRef<number | null>(null);

	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED") {
			router.replace("/login");
		}
	}, [error, router]);

	const errorMessage = !planId
		? "planId가 필요합니다."
		: error && error.message !== "UNAUTHENTICATED" && !detail
			? error.message
			: null;

	const showLoading = Boolean(planId) && isPending && !detail;

	const stages = detail?.stages ?? [];
	const stage = stages[dayNumber - 1];

	const location = useCurrentLocationKm(detail?.trackPoints ?? null);

	const datePart = detail != null ? stageDayLabel(dayNumber, detail.plan.start_date) : "";

	const headerTitle =
		datePart.trim() !== "" ? `Stage ${dayNumber} · ${datePart}` : `Stage ${dayNumber}`;

	useLayoutEffect(() => {
		navigation.setOptions({
			title: headerTitle,
			headerRight: () => (
				<HeaderButton
					accessibilityLabel="스테이지 편집"
					onPress={() => {
						router.push({
							pathname: "/routes/[routeId]/plans/[planId]/stages/[dayNumber]/edit",
							params: {
								routeId: routeId ?? "",
								planId: planId ?? "",
								dayNumber: dayNumberParam ?? "",
							},
						});
					}}
				>
					<SymbolView
						name={{
							ios: "square.and.pencil",
							android: "edit",
							web: "edit",
						}}
						size={22}
						tintColor={theme.tint}
					/>
				</HeaderButton>
			),
		});
	}, [navigation, router, routeId, planId, dayNumberParam, headerTitle, theme.tint]);

	useEffect(() => {
		const km = location.currentKm;
		if (km == null || stage == null) return;
		if (lastSeenCurrentKmRef.current === km) return;
		lastSeenCurrentKmRef.current = km;

		const startKm = (stage.start_distance ?? 0) / 1000;
		const endKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
		const tolerance = 0.05;
		const isInStage = km >= startKm - tolerance && km <= endKm + tolerance;
		if (!isInStage) {
			setSnackbarMessage("현재 위치는 이 스테이지의 경로 밖에 있습니다.");
		}
	}, [location.currentKm, stage]);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scrollContent}
					contentInsetAdjustmentBehavior="automatic"
				>
					<View style={styles.scrollInner}>
						{showLoading ? (
							<View style={styles.loadingBlock}>
								<ActivityIndicator
									accessibilityLabel="스테이지 정보 불러오는 중"
									color={theme.tint}
								/>
								<ThemedText type="small" themeColor="textSecondary">
									불러오는 중…
								</ThemedText>
							</View>
						) : errorMessage ? (
							<View style={styles.placeholderBlock}>
								<ThemedText type="small" style={{ color: theme.danger }} selectable>
									{errorMessage}
								</ThemedText>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="다시 시도"
									style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
									onPress={() => void refetch()}
								>
									<ThemedText type="smallBold">다시 시도</ThemedText>
								</Pressable>
							</View>
						) : !(detail && stage) ? (
							<View style={styles.placeholderBlock}>
								<ThemedText type="small" themeColor="textSecondary">
									해당 일차 스테이지가 없습니다.
								</ThemedText>
							</View>
						) : (
							<>
								<StageSummaryBody
									detail={detail}
									stage={stage}
									routeId={routeId ?? ""}
									location={location}
									scrollRef={scrollRef}
									onMessage={setSnackbarMessage}
								/>
							</>
						)}
					</View>
				</ScrollView>
				<Snackbar message={snackbarMessage} onDismiss={() => setSnackbarMessage(null)} />
			</SafeAreaView>
		</ThemedView>
	);
}

type StageSummaryBodyProps = {
	detail: PlanDetail;
	stage: MobilePlanStageRow;
	routeId: string;
	location: ReturnType<typeof useCurrentLocationKm>;
	scrollRef: React.RefObject<ScrollView | null>;
	onMessage: (message: string) => void;
};

function StageSummaryBody({
	detail,
	stage,
	routeId,
	location,
	scrollRef,
	onMessage,
}: StageSummaryBodyProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const [focus, setFocus] = useState<StageFocus>("ride");
	const [isFinishing, setIsFinishing] = useState(false);
	const routeLabel = stageRouteLine(stage);
	const memo = stage.memo?.trim() || null;

	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const stageLenKm = Math.max(stageEndKm - stageStartKm, 0);
	const currentRelKm = (() => {
		const km = location.currentKm;
		if (km == null) return null;
		const tolerance = 0.05;
		if (km < stageStartKm - tolerance || km > stageEndKm + tolerance) return null;
		return Math.min(Math.max(km - stageStartKm, 0), stageLenKm);
	})();
	const nonAccommodationPois = useMemo(
		() => detail.planPois.filter((poi) => poi.poi_type !== "accommodation"),
		[detail.planPois],
	);
	const visibleSummits = removeSummitsDuplicatedByCheckpoints(
		detail.summitMarkers,
		detail.cpMarkers,
	);
	const finishPlan =
		location.currentKm == null
			? null
			: buildStageFinishPlan(
					detail.stages,
					stage.id,
					location.currentKm,
					detail.planPois,
					detail.trackPoints,
				);
	const finishUnavailableReason = finishPlan
		? null
		: stageFinishUnavailableReason(detail.stages, stage, location.currentKm);

	const finishStage = async () => {
		if (!finishPlan || isFinishing) return;
		const apiOrigin = getApiOrigin();
		if (!apiOrigin) {
			onMessage("앱 서버 주소가 설정되지 않았습니다.");
			return;
		}
		const accessToken = await getStoredAccessToken();
		if (!accessToken) {
			onMessage("다시 로그인해 주세요.");
			return;
		}

		setIsFinishing(true);
		try {
			for (const poiId of finishPlan.poiIdsToMove) {
				await patchPlanPoi(apiOrigin, accessToken, detail.plan.id, poiId, {
					assignment_mode: "stage",
					stage_id: finishPlan.nextStage.id,
				});
			}
			await putStage(apiOrigin, accessToken, finishPlan.currentStage.id, finishPlan.currentUpdate);
			await putStage(apiOrigin, accessToken, finishPlan.nextStage.id, finishPlan.nextUpdate);
			if (getRideTrackingStatus().planId === detail.plan.id) await pauseRideTracking();
			await queryClient.invalidateQueries({ queryKey: planDetailQueryKey(detail.plan.id) });
			onMessage(
				`현재 위치에서 종료했습니다. 다음 스테이지로 POI ${finishPlan.poiIdsToMove.length}곳을 옮겼습니다.`,
			);
		} catch (error) {
			await queryClient.invalidateQueries({ queryKey: planDetailQueryKey(detail.plan.id) });
			onMessage(error instanceof Error ? error.message : "스테이지 종료를 저장하지 못했습니다.");
		} finally {
			setIsFinishing(false);
		}
	};

	const confirmFinishStage = () => {
		if (!finishPlan || location.currentKm == null) return;
		Alert.alert(
			"여기서 스테이지를 종료할까요?",
			`${location.currentKm.toFixed(1)}km 지점을 오늘의 종료점과 다음 스테이지의 시작점으로 변경합니다. 뒤에 남은 POI도 다음 스테이지로 이동합니다.`,
			[
				{ text: "취소", style: "cancel" },
				{ text: "스테이지 종료", style: "destructive", onPress: () => void finishStage() },
			],
		);
	};

	return (
		<>
			{memo ? (
				<ThemedText type="small" themeColor="textSecondary" selectable style={styles.stageMemo}>
					{memo}
				</ThemedText>
			) : null}

			{routeLabel ? (
				<ThemedText type="headline" selectable numberOfLines={2} style={styles.routeLabel}>
					{routeLabel}
				</ThemedText>
			) : null}

			<CurrentLocationKmLine location={location} />
			<RideLiveActivityStatus planId={detail.plan.id} />

			<StageFocusTabs value={focus} onChange={setFocus} />

			<ThemedText type="caption" themeColor="textSecondary" selectable>
				{focus === "ride"
					? "주행 현황과 앞으로 남은 경유지를 확인합니다."
					: focus === "stay"
						? "도착 구간의 숙소를 거리와 우선순위로 비교합니다."
						: "멈춰서 경로와 고도 프로필을 자세히 확인합니다."}
			</ThemedText>

			{focus === "ride" ? (
				<>
					<PlanStageTimelineStatic
						planId={detail.plan.id}
						planPois={nonAccommodationPois}
						cpMarkers={detail.cpMarkers}
						summitMarkers={visibleSummits}
						stage={stage}
						trackPoints={detail.trackPoints}
						currentRelKm={currentRelKm}
						scrollRef={scrollRef}
						onlyUpcoming
						onMessage={onMessage}
					/>

					<View style={styles.finishSection}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="현재 위치에서 스테이지 종료"
							accessibilityState={{ disabled: !finishPlan || isFinishing }}
							disabled={!finishPlan || isFinishing}
							style={({ pressed }) => [
								styles.finishButton,
								{ borderColor: finishPlan ? theme.danger : theme.separator },
								!finishPlan && styles.finishButtonDisabled,
								(pressed || isFinishing) && styles.pressed,
							]}
							onPress={confirmFinishStage}
						>
							<AppIcon
								name="flag.checkered"
								size={17}
								tintColor={finishPlan ? theme.danger : theme.textSecondary}
							/>
							<ThemedText
								type="smallBold"
								themeColor={finishPlan ? "danger" : "textSecondary"}
							>
								{isFinishing
									? "종료 저장 중…"
									: finishPlan
										? "여기서 스테이지 종료"
										: "스테이지 종료"}
							</ThemedText>
						</Pressable>
						{finishUnavailableReason ? (
							<ThemedText type="caption" themeColor="textSecondary" selectable>
								{finishUnavailableReason}
							</ThemedText>
						) : null}
					</View>
				</>
			) : focus === "stay" ? (
				<AccommodationChoices
					planId={detail.plan.id}
					stage={stage}
					planPois={detail.planPois}
					trackPoints={detail.trackPoints}
					currentKm={location.currentKm}
					onMessage={onMessage}
				/>
			) : (
				<View style={styles.routeTools}>
					<PlanStageMiniElevation
						stage={stage}
						trackPoints={detail.trackPoints}
						currentRelKm={currentRelKm}
					/>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="전체 경로 지도 열기"
						style={({ pressed }) => [
							styles.mapButton,
							{ borderColor: theme.tint },
							pressed && styles.pressed,
						]}
						onPress={() =>
							router.push({
								pathname: "/routes/[routeId]/plans/[planId]/map",
								params: { routeId, planId: detail.plan.id },
							})
						}
					>
						<AppIcon name="map.fill" size={18} tintColor={theme.tint} />
						<ThemedText type="smallBold" themeColor="tint">
							전체 경로 지도 열기
						</ThemedText>
					</Pressable>
				</View>
			)}
		</>
	);
}

type CurrentLocationKmLineProps = {
	location: ReturnType<typeof useCurrentLocationKm>;
};

function CurrentLocationKmLine({ location }: CurrentLocationKmLineProps) {
	const theme = useTheme();
	const hasKm = location.currentKm != null;
	const kmText = hasKm ? `${location.currentKm!.toFixed(1)} km (경로 기준)` : "위치 없음";

	return (
		<View style={styles.locationRow}>
			<AppIcon
				name="location.fill"
				size={18}
				tintColor={hasKm ? theme.tint : theme.textSecondary}
			/>
			<ThemedText
				type="small"
				themeColor={hasKm ? "text" : "textSecondary"}
				style={styles.locationText}
				numberOfLines={1}
			>
				{location.permission === "denied" ? "위치 권한이 거부되어 있어요." : `현재 ${kmText}`}
			</ThemedText>
			{location.isWatching ? (
				<ThemedText type="caption" themeColor="success">
					자동
				</ThemedText>
			) : null}
			{location.error ? (
				<ThemedText type="caption" style={{ color: theme.danger }}>
					{location.error}
				</ThemedText>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="현재 위치 갱신"
				disabled={!location.canRefresh || location.isRefreshing}
				style={({ pressed }) => [
					styles.locationRefreshPill,
					{ backgroundColor: `${theme.tint}18` },
					(!location.canRefresh || location.isRefreshing) && styles.locationRefreshButtonDisabled,
					pressed && location.canRefresh && !location.isRefreshing && styles.pressed,
				]}
				onPress={() => {
					void location.refresh();
				}}
			>
				<ThemedText type="smallBold" themeColor="tint">
					{location.isRefreshing ? "가져오는 중…" : "갱신"}
				</ThemedText>
			</Pressable>
		</View>
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
		paddingVertical: Spacing.three,
	},
	scrollInner: {
		gap: Spacing.three,
	},
	stageMemo: {
		lineHeight: 20,
	},
	routeLabel: {
		marginTop: Spacing.half,
	},
	loadingBlock: {
		flexDirection: "row",
		gap: Spacing.two,
		paddingVertical: Spacing.two,
		alignItems: "center",
	},
	placeholderBlock: {
		gap: Spacing.two,
		paddingVertical: Spacing.two,
	},
	retryButton: {
		alignSelf: "flex-start",
		borderWidth: 1,
		borderColor: "#A0A4AE",
		borderRadius: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
	},
	pressed: {
		opacity: 0.75,
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		minHeight: 36,
	},
	locationText: {
		flex: 1,
		minWidth: 0,
	},
	locationRefreshPill: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.one,
		borderRadius: Radius.pill,
		borderCurve: "continuous",
	},
	locationRefreshButtonDisabled: {
		opacity: 0.5,
	},
	routeTools: {
		gap: Spacing.three,
	},
	mapButton: {
		minHeight: 48,
		borderWidth: 1,
		borderRadius: Radius.md,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
	finishButton: {
		minHeight: 44,
		borderWidth: 1,
		borderRadius: Radius.md,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
	finishSection: {
		gap: Spacing.one,
	},
	finishButtonDisabled: {
		opacity: 0.55,
	},
});

function stageFinishUnavailableReason(
	stages: MobilePlanStageRow[],
	stage: MobilePlanStageRow,
	currentKm: number | null,
): string {
	if (currentKm == null || !Number.isFinite(currentKm)) {
		return "현재 위치를 확인하면 사용할 수 있습니다.";
	}

	const stageIndex = stages.findIndex((item) => item.id === stage.id);
	if (!stages[stageIndex + 1]) {
		return "마지막 스테이지에는 이동할 다음 스테이지가 없습니다.";
	}

	const startKm = (stage.start_distance ?? 0) / 1000;
	const endKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	if (currentKm <= startKm) {
		return "스테이지 시작점보다 이동한 뒤 종료할 수 있습니다.";
	}
	if (currentKm >= endKm) {
		return "계획된 스테이지 종료점에 도착한 상태입니다.";
	}
	return "현재 위치에서는 스테이지를 종료할 수 없습니다.";
}

/** `StageDetailPanel`과 동일: 출발·도착 이름이 모두 있을 때만 표시 */
function stageRouteLine(stage: MobilePlanStageRow): string | null {
	const startLabel = stage.start_name?.trim();
	const endLabel = stage.end_name?.trim();
	if (startLabel && endLabel) return `${startLabel} → ${endLabel}`;
	return null;
}
