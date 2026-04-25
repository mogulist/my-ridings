import { type PlanPoiSnapInput, snapPlanPoisToTrack } from "@my-ridings/plan-geometry";
import { StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Fonts, Spacing } from "@/constants/theme";
import type { MobilePlanStageRow, PlanPoiRow, TrackPoint } from "@/features/api/plan-my-route";
import { useTheme } from "@/hooks/use-theme";

/** `PlanStageTimelineStatic` / 웹 `PoiEditDialog` 와 동일 라벨 */
const POI_TYPE_LABEL_KO: Record<string, string> = {
	convenience: "편의점",
	mart: "마트",
	accommodation: "숙소",
	cafe: "카페",
	restaurant: "식당",
};

function poiTypeLabel(poiType: string): string {
	return POI_TYPE_LABEL_KO[poiType] ?? poiType;
}

const LEFT_KM_WIDTH = 56;
const AXIS_WIDTH = 24;
const DOT_SIZE = 10;
const BAR_WIDTH = 2;

export type StagePoiMemoRow = {
	poi: PlanPoiRow;
	relKm: number;
};

export function getOrderedPlanPoisInStage(
	planPois: PlanPoiRow[],
	trackPoints: TrackPoint[],
	stage: MobilePlanStageRow,
): StagePoiMemoRow[] {
	const stageStartKm = (stage.start_distance ?? 0) / 1000;
	const stageEndKm = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const snapped =
		trackPoints.length > 0
			? snapPlanPoisToTrack(planPois as PlanPoiSnapInput[], trackPoints)
			: [];
	const inStage = snapped.filter(
		(p) => p.distanceKm >= stageStartKm && p.distanceKm <= stageEndKm,
	);
	const byId = new Map(planPois.map((p) => [p.id, p]));
	return inStage
		.map((s) => {
			const poi = byId.get(s.id);
			if (!poi) return null;
			return {
				poi,
				relKm: Math.max(0, s.distanceKm - stageStartKm),
			};
		})
		.filter((x): x is StagePoiMemoRow => x != null);
}

function formatStageKm(relKm: number): string {
	const rounded = Math.round(relKm * 10) / 10;
	const n = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${n}km`;
}

export type StageEditPoiMemoListProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	planPois: PlanPoiRow[];
	poiMemoById: Record<string, string>;
	onChangePoiMemo: (poiId: string, text: string) => void;
};

export function StageEditPoiMemoList({
	stage,
	trackPoints,
	planPois,
	poiMemoById,
	onChangePoiMemo,
}: StageEditPoiMemoListProps) {
	const theme = useTheme();
	const rows = getOrderedPlanPoisInStage(planPois, trackPoints, stage);

	if (rows.length === 0) {
		return (
			<View style={styles.wrap}>
				<ThemedText type="smallBold" style={styles.sectionTitle}>
					경유 포인트
				</ThemedText>
				<View style={styles.timelineContainer}>
					<ThemedText type="small" themeColor="textSecondary">
						이 스테이지 구간에 등록된 POI가 없습니다.
					</ThemedText>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.wrap}>
			<ThemedText type="smallBold" style={styles.sectionTitle}>
				경유 포인트
			</ThemedText>
			<View style={styles.timelineContainer}>
				<View style={styles.columnHeader}>
					<ThemedText
						type="caption"
						themeColor="textSecondary"
						style={[styles.leftColHeader, { width: LEFT_KM_WIDTH }]}
					>
						거리
					</ThemedText>
					<View style={{ width: AXIS_WIDTH }} />
					<ThemedText type="caption" themeColor="textSecondary" style={styles.rightColHeader}>
						일정
					</ThemedText>
				</View>

				<View style={styles.listBody}>
				{rows.map((row, index) => (
					<View key={row.poi.id}>
						{index > 0 ? (
							<View style={[styles.gapRow, { height: 10 }]}>
								<View style={{ width: LEFT_KM_WIDTH }} />
								<View style={[styles.axisSlot, { width: AXIS_WIDTH }]}>
									<View style={[styles.axisSegment, { backgroundColor: theme.separator }]} />
								</View>
								<View style={styles.flex1} />
							</View>
						) : null}
						<View style={styles.milestoneRow}>
							<ThemedText
								type="caption"
								style={[
									styles.kmCell,
									{ width: LEFT_KM_WIDTH, color: theme.text, fontFamily: Fonts.rounded },
								]}
							>
								{formatStageKm(row.relKm)}
							</ThemedText>
							<View style={[styles.axisSlot, { width: AXIS_WIDTH }]}>
								<View
									style={[
										styles.poiDot,
										{
											backgroundColor: "transparent",
											borderWidth: 2,
											borderColor: theme.separator,
										},
									]}
								/>
							</View>
							<View style={styles.labelBlock}>
								<ThemedText type="smallBold" numberOfLines={2}>
									{row.poi.name?.trim() || "POI"}
								</ThemedText>
								<ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
									{poiTypeLabel(row.poi.poi_type)}
								</ThemedText>
								<TextInput
									value={poiMemoById[row.poi.id] ?? ""}
									onChangeText={(t) => onChangePoiMemo(row.poi.id, t)}
									placeholder="메모 (선택)"
									placeholderTextColor={theme.textSecondary}
									multiline
									accessibilityLabel={`${row.poi.name ?? "POI"} 메모`}
									style={[
										styles.memoInput,
										{
											color: theme.text,
											borderColor: theme.separator,
											backgroundColor: theme.backgroundElement,
										},
									]}
								/>
							</View>
						</View>
					</View>
				))}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: Spacing.two,
	},
	sectionTitle: {},
	timelineContainer: {
		paddingTop: Spacing.two,
	},
	columnHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing.two,
	},
	leftColHeader: {
		textAlign: "right",
		paddingRight: Spacing.one,
	},
	rightColHeader: {
		flex: 1,
		paddingLeft: Spacing.two,
	},
	listBody: {
		position: "relative",
	},
	gapRow: {
		flexDirection: "row",
		alignItems: "stretch",
	},
	axisSlot: {
		alignItems: "center",
	},
	axisSegment: {
		width: BAR_WIDTH,
		flex: 1,
		borderRadius: 1,
	},
	flex1: {
		flex: 1,
	},
	milestoneRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		minHeight: 44,
	},
	kmCell: {
		textAlign: "right",
		paddingRight: Spacing.one,
		fontVariant: ["tabular-nums"],
		fontSize: 13,
		lineHeight: 18,
		paddingTop: 4,
	},
	poiDot: {
		width: DOT_SIZE,
		height: DOT_SIZE,
		borderRadius: DOT_SIZE / 2,
		marginTop: 6,
	},
	labelBlock: {
		flex: 1,
		paddingLeft: Spacing.two,
		minWidth: 0,
		gap: 2,
	},
	memoInput: {
		marginTop: 6,
		minHeight: 72,
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.two,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		fontSize: 13,
		lineHeight: 18,
		textAlignVertical: "top",
	},
});
