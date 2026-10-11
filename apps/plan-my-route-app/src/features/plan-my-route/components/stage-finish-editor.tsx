import { uuid } from "expo-modules-core";
import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import type { MobilePlanStageRow, PlanPoiRow, TrackPoint } from "@/features/api/plan-my-route";
import { buildStageFinishPlan, parseStageFinishKm, type StageFinishPlan } from "../stage-finish";
export function StageFinishEditor({
	stages,
	stage,
	pois,
	track,
	currentKm,
	onSave,
}: {
	stages: MobilePlanStageRow[];
	stage: MobilePlanStageRow;
	pois: PlanPoiRow[];
	track: TrackPoint[];
	currentKm: number | null;
	onSave: (plan: StageFinishPlan, requestId: string) => Promise<void>;
}) {
	const gainLabel = (m: number | null | undefined) =>
		m == null ? "상승 정보 없음" : `상승 +${Math.round(m)}m`;
	const theme = useTheme(),
		[expanded, setExpanded] = useState(false),
		[input, setInput] = useState(""),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<string | null>(null),
		[saved, setSaved] = useState(false);
	const request = useRef<{ key: string; id: string } | null>(null),
		km = parseStageFinishKm(input),
		preview = km == null ? null : buildStageFinishPlan(stages, stage.id, km, pois, track);
	const index = stages.indexOf(stage),
		start = (stage.start_distance ?? 0) / 1000,
		end = (stage.end_distance ?? 0) / 1000;
	const currentValid =
		currentKm != null && !!buildStageFinishPlan(stages, stage.id, currentKm, pois, track);
	const hasNext = !!stages[index + 1];
	const button = {
		minHeight: 48,
		paddingHorizontal: 12,
		justifyContent: "center" as const,
		borderRadius: 12,
	};
	return (
		<View style={{ gap: 12 }}>
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				disabled={!hasNext || busy || !track.length}
				style={button}
				onPress={() => {
					setExpanded(!expanded);
					setSaved(false);
				}}
			>
				<ThemedText type="smallBold" themeColor={hasNext ? "tint" : "textSecondary"}>
					{expanded ? "종료 지점 지정 닫기" : "종료 지점 직접 지정"}
				</ThemedText>
			</Pressable>
			{!hasNext ? (
				<ThemedText type="caption" themeColor="textSecondary">
					마지막 스테이지에는 다음 시작점을 옮기는 조기 종료를 적용할 수 없습니다.
				</ThemedText>
			) : null}
			{hasNext && !expanded ? (
				<ThemedText type="caption" themeColor="textSecondary">
					종료를 놓쳤어도 현재 위치와 관계없이 실제 종료 지점을 지정할 수 있습니다.
				</ThemedText>
			) : null}
			{expanded ? (
				<View
					style={{
						gap: 14,
						padding: 18,
						backgroundColor: theme.backgroundElement,
						borderRadius: 18,
					}}
				>
					<ThemedText type="headline">실제로 마친 지점</ThemedText>
					<ThemedText type="small" themeColor="textSecondary">
						전체 경로 기준 km를 입력하세요. 스테이지 출발 {start.toFixed(1)}km · 계획된 종료{" "}
						{end.toFixed(1)}km
					</ThemedText>
					<TextInput
						accessibilityLabel="종료 지점 전체 경로 km"
						value={input}
						onChangeText={(value) => {
							setInput(value);
							setError(null);
							setSaved(false);
						}}
						editable={!busy}
						keyboardType="decimal-pad"
						placeholder="예: 83.5"
						placeholderTextColor={theme.textSecondary}
						style={{
							color: theme.text,
							minHeight: 48,
							borderWidth: 1,
							borderColor: theme.separator,
							borderRadius: 10,
							paddingHorizontal: 12,
						}}
					/>
					<Pressable
						accessibilityRole="button"
						disabled={!currentValid || busy}
						style={{ ...button, opacity: currentValid ? 1 : 0.5 }}
						onPress={() => setInput(currentKm!.toFixed(3))}
					>
						<ThemedText type="small" themeColor="tint">
							현재 위치 사용{currentKm != null ? ` · ${currentKm.toFixed(1)}km` : ""}
						</ThemedText>
					</Pressable>
					{!preview && input ? (
						<ThemedText type="small" style={{ color: theme.danger }}>
							출발 이후부터 계획된 종료 이전 사이의 거리를 입력하세요. 소수점은 최대 세 자리입니다.
						</ThemedText>
					) : null}
					{preview ? (
						<>
							<ThemedText type="smallBold">변경 미리보기</ThemedText>
							<View style={{ gap: 8 }}>
								<ThemedText type="small" selectable>
									오늘 종료 {km!.toFixed(3)}km · 스테이지 내 {(km! - start).toFixed(1)}km
								</ThemedText>
								<ThemedText type="small" selectable>
									다음 시작 {km!.toFixed(3)}km · 다음 구간{" "}
									{((preview.nextStage.end_distance ?? 0) / 1000 - km!).toFixed(1)}km
								</ThemedText>
								<ThemedText type="small">
									오늘 {gainLabel(preview.currentUpdate.elevation_gain)}
								</ThemedText>
								<ThemedText type="small">
									다음 {gainLabel(preview.nextUpdate.elevation_gain)}
								</ThemedText>
							</View>
							<ThemedText type="smallBold">
								다음 스테이지로 이동할 POI {preview.poiIdsToMove.length}곳
							</ThemedText>
							{preview.poiIdsToMove.map((id) => (
								<ThemedText key={id} type="small">
									{pois.find((p) => p.id === id)?.name ?? "POI"}
								</ThemedText>
							))}
							<ThemedText type="caption" themeColor="textSecondary">
								계획보다 일찍 마친 경우의 경계를 조정합니다. 완료 기록이나 종료점 연장은 포함하지
								않습니다.
							</ThemedText>
						</>
					) : null}
					{error ? (
						<ThemedText type="small" style={{ color: theme.danger }}>
							{error}
						</ThemedText>
					) : null}
					{saved ? (
						<ThemedText type="smallBold" themeColor="tint">
							종료 지점을 저장했습니다.
						</ThemedText>
					) : null}
					<Pressable
						accessibilityRole="button"
						disabled={!preview || busy}
						style={{ ...button, backgroundColor: theme.tint, opacity: preview && !busy ? 1 : 0.5 }}
						onPress={() => {
							if (!preview) return;
							const key = `${stage.id}:${km}`;
							if (request.current?.key !== key) request.current = { key, id: uuid.v4() };
							setBusy(true);
							setError(null);
							void onSave(preview, request.current.id)
								.then(() => {
									setSaved(true);
									setInput("");
								})
								.catch((e) =>
									setError(
										e instanceof Error ? e.message : "저장하지 못했습니다. 다시 시도해 주세요.",
									),
								)
								.finally(() => setBusy(false));
						}}
					>
						<ThemedText type="smallBold" style={{ color: "#fff" }}>
							{busy ? "저장 중…" : "종료 지점 저장"}
						</ThemedText>
					</Pressable>
				</View>
			) : null}
		</View>
	);
}
