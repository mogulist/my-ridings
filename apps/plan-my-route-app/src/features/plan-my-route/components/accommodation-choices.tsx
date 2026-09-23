import {
	groupAccommodationCandidates,
	planPoiBelongsToStage,
	snapPlanPoisToTrack,
} from "@my-ridings/plan-geometry";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import type { MobilePlanStageRow, PlanPoiRow, TrackPoint } from "@/features/api/plan-my-route";
import { patchPlanPoi } from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { planDetailQueryKey } from "@/features/plan-my-route/plan-detail-query";
import { useTheme } from "@/hooks/use-theme";

const PASSED_TOLERANCE_KM = 1;

const INTENT_LABELS: Record<PlanPoiRow["intent"], string> = {
	candidate: "후보",
	planned: "선택",
	confirmed: "확정",
};

const BOOKING_METHOD_LABELS: Record<PlanPoiRow["booking_method"], string> = {
	unconfirmed: "예약 미확인",
	naver: "네이버 예약",
	secretmall: "시크릿몰",
	yeogi: "여기어때",
	agoda: "아고다",
	phone: "전화 예약",
	walk_in: "현장 예약",
	other: "기타 예약",
};

type AccommodationChoiceItem = {
	id: string;
	distanceKm: number;
	sortOrder: number | null;
	poi: PlanPoiRow;
};

type AccommodationChoicesProps = {
	planId: string;
	stage: MobilePlanStageRow;
	planPois: PlanPoiRow[];
	trackPoints: TrackPoint[];
	currentKm: number | null;
	onMessage: (message: string) => void;
};

export function AccommodationChoices({
	planId,
	stage,
	planPois,
	trackPoints,
	currentKm,
	onMessage,
}: AccommodationChoicesProps) {
	const theme = useTheme();
	const queryClient = useQueryClient();
	const [savingId, setSavingId] = useState<string | null>(null);
	const { groups, excluded } = useMemo(() => {
		const poiById = new Map(planPois.map((poi) => [poi.id, poi]));
		const snapped = snapPlanPoisToTrack(planPois, trackPoints);
		const stageRange = {
			id: stage.id,
			startDistanceKm: (stage.start_distance ?? 0) / 1000,
			endDistanceKm: (stage.end_distance ?? stage.start_distance ?? 0) / 1000,
		};

		const items = snapped.flatMap((snappedPoi) => {
			const poi = poiById.get(snappedPoi.id);
			if (
				!poi ||
				poi.poi_type !== "accommodation" ||
				!planPoiBelongsToStage(snappedPoi, stageRange)
			) {
				return [];
			}
			return [
				{
					id: poi.id,
					distanceKm: snappedPoi.distanceKm,
					sortOrder: poi.candidate_sort_order,
					poi,
				},
			];
		});

		return {
			groups: groupAccommodationCandidates(items.filter((item) => !item.poi.is_candidate_excluded)),
			excluded: items
				.filter((item) => item.poi.is_candidate_excluded)
				.sort((a, b) => a.distanceKm - b.distanceKm),
		};
	}, [planPois, stage, trackPoints]);

	const activeGroupIndex = findActiveGroupIndex(groups, currentKm);
	const [expandedGroupIndex, setExpandedGroupIndex] = useState<number | null>(activeGroupIndex);

	useEffect(() => {
		if (activeGroupIndex >= 0) setExpandedGroupIndex(activeGroupIndex);
	}, [activeGroupIndex]);

	if (groups.length === 0 && excluded.length === 0) return null;

	const setExcluded = async (item: AccommodationChoiceItem, value: boolean) => {
		if (savingId) return;
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

		setSavingId(item.poi.id);
		try {
			await patchPlanPoi(apiOrigin, accessToken, planId, item.poi.id, {
				is_candidate_excluded: value,
			});
			await queryClient.invalidateQueries({ queryKey: planDetailQueryKey(planId) });
			onMessage(value ? `${item.poi.name}: 방 없음` : `${item.poi.name}: 후보로 복원`);
		} catch (error) {
			onMessage(error instanceof Error ? error.message : "숙소 상태를 저장하지 못했습니다.");
		} finally {
			setSavingId(null);
		}
	};

	const activeGroup = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null;
	const activeFirst = activeGroup?.items[0];
	const nextGroup = activeGroupIndex >= 0 ? groups[activeGroupIndex + 1] : null;
	const allPassed = currentKm != null && activeGroup == null;
	const approachGainM = activeGroup
		? elevationGainBetween(
				trackPoints,
				currentKm ?? (stage.start_distance ?? 0) / 1000,
				activeGroup.startDistanceKm,
			)
		: 0;

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeading}>
				<View style={styles.sectionTitleRow}>
					<AppIcon name="bed.double.fill" size={18} tintColor={theme.warning} />
					<ThemedText type="headline" selectable>
						숙박 선택지
					</ThemedText>
				</View>
				<ThemedText type="caption" themeColor="textSecondary" selectable>
					{groups.length}개 구간 · 숙소 {groups.reduce((sum, group) => sum + group.items.length, 0)}
					곳
				</ThemedText>
			</View>

			{groups.length > 0 ? (
				<View
					style={[
						styles.nextCard,
						{
							backgroundColor: theme.surfaceElevated,
							borderColor: theme.warning,
							boxShadow: Shadow.card,
						},
					]}
				>
					{allPassed ? (
						<>
							<ThemedText type="smallBold" style={{ color: theme.warning }} selectable>
								등록한 숙박 선택지를 모두 지났어요
							</ThemedText>
							<ThemedText type="small" themeColor="textSecondary" selectable>
								아래에서 지나온 숙소를 다시 확인할 수 있습니다.
							</ThemedText>
						</>
					) : activeGroup && activeFirst ? (
						<>
							<View style={styles.nextCardTop}>
								<View style={styles.nextCardTitleBlock}>
									<ThemedText type="caption" style={{ color: theme.warning }} selectable>
										다음 숙박 선택지 {activeGroupIndex + 1}
									</ThemedText>
									<ThemedText type="metricSm" selectable>
										{formatRemainingDistance(currentKm, activeGroup.startDistanceKm)}
									</ThemedText>
								</View>
								<View style={[styles.countPill, { backgroundColor: `${theme.warning}18` }]}>
									<ThemedText type="smallBold" style={{ color: theme.warning }} selectable>
										숙소 {activeGroup.items.length}곳
									</ThemedText>
								</View>
							</View>
							{approachGainM > 0 ? (
								<ThemedText type="caption" themeColor="textSecondary" selectable>
									선택지까지 남은 오르막 +{approachGainM.toLocaleString()}m
								</ThemedText>
							) : null}
							<View style={[styles.nextDivider, { backgroundColor: theme.separator }]} />
							<View style={styles.nextHotelRow}>
								<View style={styles.priorityCircle}>
									<ThemedText type="caption" style={styles.priorityText} selectable>
										1
									</ThemedText>
								</View>
								<View style={styles.nextHotelText}>
									<ThemedText type="smallBold" numberOfLines={1} selectable>
										{activeFirst.poi.name}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										numberOfLines={1}
										selectable
									>
										{formatIntent(activeFirst.poi.intent)} · 경로{" "}
										{activeFirst.distanceKm.toFixed(1)}km
									</ThemedText>
								</View>
								<QuickActions poi={activeFirst.poi} compact onMessage={onMessage} />
							</View>
							{nextGroup ? (
								<ThemedText type="caption" themeColor="textSecondary" selectable>
									다음 선택지는 여기서{" "}
									{formatKm(nextGroup.startDistanceKm - activeGroup.startDistanceKm)} 더
								</ThemedText>
							) : (
								<ThemedText type="caption" themeColor="textSecondary" selectable>
									이 스테이지의 마지막 숙박 선택지입니다.
								</ThemedText>
							)}
						</>
					) : null}
				</View>
			) : null}

			<View style={styles.groupList}>
				{groups.map((group, groupIndex) => {
					const passed = currentKm != null && group.endDistanceKm < currentKm - PASSED_TOLERANCE_KM;
					const expanded = expandedGroupIndex === groupIndex;
					return (
						<View
							key={group.items.map((item) => item.id).join(":")}
							style={[styles.group, { borderColor: theme.separator }, passed && styles.passedGroup]}
						>
							<PressableHaptic
								accessibilityLabel={`숙박 선택지 ${groupIndex + 1} ${expanded ? "접기" : "펼치기"}`}
								accessibilityState={{ expanded }}
								style={styles.groupHeader}
								onPress={() => setExpandedGroupIndex(expanded ? null : groupIndex)}
							>
								<View style={styles.groupHeaderText}>
									<View style={styles.groupTitleRow}>
										<ThemedText type="smallBold" selectable>
											선택지 {groupIndex + 1}
										</ThemedText>
										{passed ? (
											<ThemedText type="caption" themeColor="textSecondary" selectable>
												지남
											</ThemedText>
										) : groupIndex === activeGroupIndex ? (
											<ThemedText type="caption" style={{ color: theme.warning }} selectable>
												다음
											</ThemedText>
										) : null}
									</View>
									<ThemedText type="caption" themeColor="textSecondary" selectable>
										{formatGroupRange(group.startDistanceKm, group.endDistanceKm)} · 숙소{" "}
										{group.items.length}곳
									</ThemedText>
								</View>
								<AppIcon
									name={expanded ? "chevron.up" : "chevron.down"}
									size={14}
									tintColor={theme.textSecondary}
								/>
							</PressableHaptic>

							{expanded ? (
								<View style={[styles.hotelList, { borderTopColor: theme.separator }]}>
									{group.items.map((item, itemIndex) => (
										<AccommodationRow
											key={item.id}
											item={item}
											priority={itemIndex + 1}
											onMessage={onMessage}
											disabled={Boolean(savingId)}
											onExclude={() => void setExcluded(item, true)}
										/>
									))}
								</View>
							) : null}
						</View>
					);
				})}
			</View>

			{excluded.length > 0 ? (
				<View style={styles.excludedSection}>
					<ThemedText type="smallBold" themeColor="textSecondary">
						제외한 숙소 {excluded.length}곳
					</ThemedText>
					{excluded.map((item) => (
						<View
							key={`excluded-${item.id}`}
							style={[styles.excludedRow, { borderColor: theme.separator }]}
						>
							<ThemedText type="small" numberOfLines={1} style={styles.excludedName}>
								{item.poi.name}
							</ThemedText>
							<ThemedText type="caption" themeColor="danger">
								방 없음
							</ThemedText>
							<PressableHaptic
								accessibilityRole="button"
								accessibilityLabel={`${item.poi.name} 후보로 복원`}
								disabled={Boolean(savingId)}
								onPress={() => void setExcluded(item, false)}
							>
								<ThemedText type="caption" themeColor="tint">
									복원
								</ThemedText>
							</PressableHaptic>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}

function AccommodationRow({
	item,
	priority,
	onMessage,
	disabled,
	onExclude,
}: {
	item: AccommodationChoiceItem;
	priority: number;
	onMessage: (message: string) => void;
	disabled: boolean;
	onExclude: () => void;
}) {
	const theme = useTheme();
	const { poi } = item;
	return (
		<View style={styles.hotelRow}>
			<View style={[styles.rank, { backgroundColor: `${theme.warning}18` }]}>
				<ThemedText type="smallBold" style={{ color: theme.warning }} selectable>
					{priority}
				</ThemedText>
			</View>
			<View style={styles.hotelBody}>
				<View style={styles.hotelTitleRow}>
					<ThemedText type="smallBold" style={styles.hotelName} numberOfLines={2} selectable>
						{poi.name}
					</ThemedText>
					<View style={[styles.intentBadge, { backgroundColor: intentColor(poi.intent, theme) }]}>
						<ThemedText type="caption" selectable>
							{INTENT_LABELS[poi.intent]}
						</ThemedText>
					</View>
				</View>
				<ThemedText type="caption" themeColor="textSecondary" selectable>
					경로 {item.distanceKm.toFixed(1)}km · {BOOKING_METHOD_LABELS[poi.booking_method]}
				</ThemedText>
				{poi.address_name ? (
					<ThemedText type="caption" themeColor="textSecondary" numberOfLines={2} selectable>
						{poi.address_name}
					</ThemedText>
				) : null}
				{poi.memo?.trim() ? (
					<ThemedText type="small" numberOfLines={3} selectable>
						{poi.memo.trim()}
					</ThemedText>
				) : null}
				{poi.booking_checked_at ? (
					<ThemedText type="caption" themeColor="textSecondary" selectable>
						예약 정보 {formatCheckedAt(poi.booking_checked_at)} 확인
					</ThemedText>
				) : null}
				<View style={styles.hotelActions}>
					<QuickActions poi={poi} compact onMessage={onMessage} />
					<PressableHaptic
						accessibilityRole="button"
						accessibilityLabel={`${poi.name} 방 없음으로 제외`}
						disabled={disabled}
						style={[styles.unavailableButton, { borderColor: theme.danger }]}
						onPress={onExclude}
					>
						<ThemedText type="caption" themeColor="danger">
							방 없음
						</ThemedText>
					</PressableHaptic>
				</View>
			</View>
		</View>
	);
}

function QuickActions({
	poi,
	compact = false,
	onMessage,
}: {
	poi: PlanPoiRow;
	compact?: boolean;
	onMessage: (message: string) => void;
}) {
	const theme = useTheme();
	const naverUrl = safeWebUrl(poi.naver_place_url);
	const bookingUrl = safeWebUrl(poi.booking_url);
	return (
		<View style={compact ? styles.compactActions : styles.actions}>
			{poi.phone ? (
				<ActionButton
					label={compact ? "" : "전화"}
					accessibilityLabel={`${poi.name}에 전화`}
					icon="phone.fill"
					color={theme.tint}
					compact={compact}
					onPress={() => openExternalUrl(`tel:${poi.phone}`, onMessage)}
				/>
			) : null}
			{naverUrl ? (
				<ActionButton
					label={compact ? "" : "네이버 지도"}
					accessibilityLabel={`${poi.name} 네이버 지도 열기`}
					icon="map.fill"
					color={theme.tint}
					compact={compact}
					onPress={() => openExternalUrl(naverUrl, onMessage)}
				/>
			) : null}
			{bookingUrl ? (
				<ActionButton
					label={compact ? "" : "예약"}
					accessibilityLabel={`${poi.name} 예약 페이지 열기`}
					icon="safari.fill"
					color={theme.warning}
					compact={compact}
					onPress={() => openExternalUrl(bookingUrl, onMessage)}
				/>
			) : null}
		</View>
	);
}

function ActionButton({
	label,
	accessibilityLabel,
	icon,
	color,
	compact,
	onPress,
}: {
	label: string;
	accessibilityLabel: string;
	icon: string;
	color: string;
	compact: boolean;
	onPress: () => void;
}) {
	return (
		<PressableHaptic
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			style={[
				styles.actionButton,
				compact && styles.compactActionButton,
				{ borderColor: `${color}40` },
			]}
			onPress={onPress}
		>
			<AppIcon name={icon} size={compact ? 18 : 15} tintColor={color} />
			{label ? (
				<ThemedText type="caption" style={{ color }}>
					{label}
				</ThemedText>
			) : null}
		</PressableHaptic>
	);
}

function findActiveGroupIndex(
	groups: ReturnType<typeof groupAccommodationCandidates<AccommodationChoiceItem>>,
	currentKm: number | null,
): number {
	if (groups.length === 0) return -1;
	if (currentKm == null) return 0;
	return groups.findIndex((group) => group.endDistanceKm >= currentKm - PASSED_TOLERANCE_KM);
}

function formatRemainingDistance(currentKm: number | null, targetKm: number): string {
	if (currentKm == null) return `경로 ${targetKm.toFixed(1)}km`;
	const remainingKm = Math.max(targetKm - currentKm, 0);
	return remainingKm < 0.1 ? "지금 도착 구간" : `앞으로 ${formatKm(remainingKm)}`;
}

function formatGroupRange(startKm: number, endKm: number): string {
	return Math.abs(endKm - startKm) < 0.05
		? `${startKm.toFixed(1)}km`
		: `${startKm.toFixed(1)}–${endKm.toFixed(1)}km`;
}

function formatKm(value: number): string {
	return `${value.toFixed(1)}km`;
}

function formatIntent(intent: PlanPoiRow["intent"]): string {
	return INTENT_LABELS[intent];
}

function formatCheckedAt(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("ko-KR", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function safeWebUrl(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
	} catch {
		return null;
	}
}

function elevationGainBetween(trackPoints: TrackPoint[], startKm: number, endKm: number): number {
	if (endKm <= startKm) return 0;
	let gainM = 0;
	let previousElevation: number | null = null;
	for (const point of trackPoints) {
		if (point.d == null || point.e == null) continue;
		const distanceKm = point.d / 1000;
		if (distanceKm < startKm) {
			previousElevation = point.e;
			continue;
		}
		if (distanceKm > endKm) break;
		if (previousElevation != null && point.e > previousElevation) {
			gainM += point.e - previousElevation;
		}
		previousElevation = point.e;
	}
	return Math.round(gainM);
}

function openExternalUrl(url: string, onMessage: (message: string) => void): void {
	void Linking.openURL(url).catch(() => {
		onMessage("링크를 열지 못했습니다.");
	});
}

function intentColor(intent: PlanPoiRow["intent"], theme: ReturnType<typeof useTheme>): string {
	if (intent === "confirmed") return `${theme.success}28`;
	if (intent === "planned") return `${theme.tint}22`;
	return theme.backgroundElement;
}

const styles = StyleSheet.create({
	section: {
		gap: Spacing.two,
	},
	sectionHeading: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: Spacing.two,
	},
	sectionTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	nextCard: {
		borderWidth: 1,
		borderLeftWidth: 4,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		padding: Spacing.three,
		gap: Spacing.two,
	},
	nextCardTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.two,
	},
	nextCardTitleBlock: {
		flex: 1,
		gap: Spacing.half,
	},
	countPill: {
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.one,
		borderRadius: Radius.pill,
	},
	nextDivider: {
		height: StyleSheet.hairlineWidth,
	},
	nextHotelRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	priorityCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FF9500",
	},
	priorityText: {
		color: "#FFFFFF",
		fontWeight: "700",
	},
	nextHotelText: {
		flex: 1,
		minWidth: 0,
	},
	groupList: {
		gap: Spacing.two,
	},
	group: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: Radius.md,
		borderCurve: "continuous",
		overflow: "hidden",
	},
	passedGroup: {
		opacity: 0.58,
	},
	groupHeader: {
		minHeight: 58,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	groupHeaderText: {
		flex: 1,
		gap: Spacing.half,
	},
	groupTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	hotelList: {
		borderTopWidth: StyleSheet.hairlineWidth,
		padding: Spacing.three,
		gap: Spacing.three,
	},
	hotelRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.two,
	},
	rank: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	hotelBody: {
		flex: 1,
		minWidth: 0,
		gap: Spacing.one,
	},
	hotelTitleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.two,
	},
	hotelName: {
		flex: 1,
		minWidth: 0,
	},
	intentBadge: {
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.half,
	},
	unavailableButton: {
		minHeight: 40,
		justifyContent: "center",
		borderWidth: 1,
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.two,
	},
	hotelActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		paddingTop: Spacing.one,
	},
	excludedSection: {
		gap: Spacing.one,
	},
	excludedRow: {
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.three,
	},
	excludedName: {
		flex: 1,
		minWidth: 0,
		textDecorationLine: "line-through",
	},
	actions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.two,
		paddingTop: Spacing.one,
	},
	compactActions: {
		flexDirection: "row",
		gap: Spacing.one,
	},
	actionButton: {
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.three,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.one,
	},
	compactActionButton: {
		width: 40,
		paddingHorizontal: 0,
	},
});
