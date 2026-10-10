import { analyzeTerrain, summarizeTerrain } from "@my-ridings/plan-geometry";
import { useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import type { MobilePlanStageRow, TrackPoint } from "@/features/api/plan-my-route";
import { buildElevationEnvelope } from "@/features/plan-my-route/elevation-envelope";
import { TERRAIN_COLORS } from "@/features/plan-my-route/components/ride-terrain-detail";
import { TERRAIN_LABELS, terrainAscent } from "@/features/plan-my-route/ride-terrain-data";
import { useTheme } from "@/hooks/use-theme";
export type PlanStageMiniElevationProps = {
	stage: MobilePlanStageRow;
	trackPoints: TrackPoint[];
	currentRelKm?: number | null;
};
export function PlanStageMiniElevation({
	stage,
	trackPoints,
	currentRelKm,
}: PlanStageMiniElevationProps) {
	const theme = useTheme();
	const chartRef = useRef<View>(null);
	const [zoom, setZoom] = useState(false),
		[width, setWidth] = useState(0),
		[selected, setSelected] = useState<number | null>(null);
	const stageStart = (stage.start_distance ?? 0) / 1000,
		stageEnd = (stage.end_distance ?? stage.start_distance ?? 0) / 1000;
	const currentKm = currentRelKm == null ? null : stageStart + currentRelKm;
	const start = zoom
		? Math.min(currentKm ?? stageStart, Math.max(stageStart, stageEnd - 20))
		: stageStart;
	const end = zoom ? Math.min(stageEnd, start + 20) : stageEnd;
	const analysis = useMemo(() => analyzeTerrain(trackPoints), [trackPoints]);
	const bins = useMemo(
		() => buildElevationEnvelope(trackPoints, start, end),
		[trackPoints, start, end],
	);
	const summary = useMemo(
		() => summarizeTerrain(analysis, start, Math.max(start, end)),
		[analysis, start, end],
	);
	const valid = bins.filter((b) => b.minM != null && b.maxM != null);
	const min = valid.length ? Math.floor(Math.min(...valid.map((b) => b.minM!)) / 100) * 100 : 0;
	const max = valid.length
		? Math.max(min + 100, Math.ceil(Math.max(...valid.map((b) => b.maxM!)) / 100) * 100)
		: 100;
	const h = 144;
	const y = (m: number) => ((m - min) / (max - min)) * h;
	const picked = selected == null ? null : bins[Math.min(selected, bins.length - 1)];
	const marker =
		currentKm != null && currentKm >= start && currentKm <= end && end > start
			? (currentKm - start) / (end - start)
			: null;
	return (
		<View style={{ gap: 12 }}>
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				<ThemedText type="headline">고도와 지형</ThemedText>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={zoom ? "스테이지 전체 고도 보기" : "20km 구간 고도 확대"}
					onPress={() => {
						setZoom(!zoom);
						setSelected(null);
					}}
					style={{
						minHeight: 44,
						justifyContent: "center",
						paddingHorizontal: 12,
						borderRadius: 12,
						backgroundColor: theme.backgroundElement,
					}}
				>
					<ThemedText type="smallBold">{zoom ? "전체 보기" : "20km 확대"}</ThemedText>
				</Pressable>
			</View>
			{valid.length === 0 ? (
				<ThemedText type="small" themeColor="textSecondary">
					이 구간의 고도 정보가 없습니다.
				</ThemedText>
			) : (
				<>
					<View style={{ flexDirection: "row", gap: 8 }}>
						<View style={{ width: 42, height: h, justifyContent: "space-between" }}>
							<ThemedText type="caption" themeColor="textSecondary">
								{max}m
							</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary">
								{min}m
							</ThemedText>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="고도 그래프의 지점 확인"
							onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
							ref={chartRef}
							onPress={(e) => {
								const pageX = e.nativeEvent.pageX;
								chartRef.current?.measureInWindow((x, _y, chartWidth) => {
									const resolvedWidth = chartWidth || width;
									if (resolvedWidth > 0 && Number.isFinite(pageX)) {
										setSelected(
											Math.max(
												0,
												Math.min(
													bins.length - 1,
													Math.floor(((pageX - x) / resolvedWidth) * bins.length),
												),
											),
										);
									}
								});
							}}
							style={{
								height: h,
								flex: 1,
								flexDirection: "row",
								alignItems: "flex-end",
								borderBottomWidth: 1,
								borderColor: theme.separator,
							}}
						>
							{bins.map((b, i) => (
								<View key={i} style={{ flex: 1, height: h, justifyContent: "flex-end" }}>
									{b.minM == null ? (
										<View style={{ height: h, backgroundColor: theme.backgroundElement }} />
									) : (
										<>
											<View
												style={{
													position: "absolute",
													bottom: 0,
													height: Math.max(1, y(b.minM)),
													width: "100%",
													backgroundColor: `${theme.tint}25`,
												}}
											/>
											<View
												style={{
													position: "absolute",
													bottom: y(b.minM),
													height: Math.max(2, y(b.maxM!) - y(b.minM)),
													width: "100%",
													backgroundColor: theme.tint,
												}}
											/>
										</>
									)}
								</View>
							))}
							{marker != null ? (
								<View
									pointerEvents="none"
									style={{
										position: "absolute",
										left: `${marker * 100}%`,
										width: 2,
										top: 0,
										bottom: 0,
										backgroundColor: theme.warning,
									}}
								/>
							) : null}
							{selected != null ? (
								<View
									pointerEvents="none"
									style={{
										position: "absolute",
										left: `${((selected + 0.5) / bins.length) * 100}%`,
										width: 1,
										top: 0,
										bottom: 0,
										backgroundColor: theme.text,
									}}
								/>
							) : null}
						</Pressable>
					</View>
					<View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 50 }}>
						<ThemedText type="caption" themeColor="textSecondary">
							{start.toFixed(1)}km
						</ThemedText>
						<ThemedText type="caption" themeColor="textSecondary">
							{end.toFixed(1)}km
						</ThemedText>
					</View>
					{picked ? (
						<ThemedText type="small" selectable>
							{picked.startKm.toFixed(1)}–{picked.endKm.toFixed(1)}km ·{" "}
							{picked.minM == null
								? "고도 정보 없음"
								: `${Math.round(picked.minM)}–${Math.round(picked.maxM!)}m`}
						</ThemedText>
					) : null}
				</>
			)}
			<View
				accessibilityLabel="거리 비례 지형 구간"
				style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }}
			>
				{summary.segments.map((s, i) => (
					<View
						key={i}
						style={{ flex: s.endKm - s.startKm, backgroundColor: TERRAIN_COLORS[s.kind] }}
					/>
				))}
			</View>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
				{Object.entries(summary.distances).map(([kind, distance]) => (
					<ThemedText key={kind} type="caption" themeColor="textSecondary">
						{TERRAIN_LABELS[kind as keyof typeof TERRAIN_LABELS]} {distance!.toFixed(1)}km
					</ThemedText>
				))}
			</View>
			<ThemedText type="small" selectable>
				표시 구간 {(end - start).toFixed(1)}km · 상승 {terrainAscent(summary)}
			</ThemedText>
			<ThemedText type="caption" themeColor="textSecondary">
				거리는 전체 경로 기준입니다. 곡선의 화면상 기울기와 실제 도로 경사도는 다릅니다. 빈 구간은
				고도 정보가 없는 곳입니다.
			</ThemedText>
		</View>
	);
}
