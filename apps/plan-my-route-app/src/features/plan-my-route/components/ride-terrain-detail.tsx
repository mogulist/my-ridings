import { useState } from "react";
import { Pressable, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
	TERRAIN_LABELS,
	terrainAscent,
	terrainSequence,
	type RideTerrainBriefing,
	type RideTerrainTarget,
} from "../ride-terrain-data";
import type { TerrainKind } from "@my-ridings/plan-geometry";

export const TERRAIN_COLORS: Record<TerrainKind, string> = {
	flat: "#637D90",
	"gentle-descent": "#3F8F96",
	descent: "#3E6FC0",
	rolling: "#B1833C",
	uphill: "#B76339",
	climb: "#C04B3A",
	unknown: "#85858B",
};
export function RideTerrainDetail({
	briefing: b,
	statusLabel,
}: {
	briefing: RideTerrainBriefing;
	statusLabel: string;
}) {
	const theme = useTheme();
	const [selection, setSelection] = useState<"supply" | "approach" | "summit" | "finish">("supply");
	const [expanded, setExpanded] = useState(false);
	const options = [
		b.supply && { key: "supply", label: "보급소까지", target: b.supply },
		b.approach && { key: "approach", label: "오르막 시작까지", target: b.approach },
		b.summit && { key: "summit", label: "정상까지", target: b.summit },
		{ key: "finish", label: "오늘 끝까지", target: b.finish },
	].filter(Boolean) as { key: typeof selection; label: string; target: RideTerrainTarget }[];
	const target = options.find((o) => o.key === selection)?.target ?? options[0].target;
	const activeKey = options.find((o) => o.target === target)?.key;
	const labelStyle = { color: theme.textSecondary, fontSize: 14, lineHeight: 21 };
	const destination = (heading: string, t: RideTerrainTarget, color: string) => (
		<View style={{ paddingVertical: 18, gap: 6 }}>
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "baseline",
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				<ThemedText type="headline" style={{ color }}>
					{heading}
				</ThemedText>
				<ThemedText type="metric">
					{t.summary.distanceKm.toFixed(1)}
					<ThemedText type="small"> km</ThemedText>
				</ThemedText>
			</View>
			<View
				style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}
			>
				<ThemedText type="smallBold" selectable style={{ flexShrink: 1 }}>
					{t.title}
				</ThemedText>
				<ThemedText type="small" selectable>
					{t.summary.gainM == null ? "고도 정보 없음" : `상승 ${terrainAscent(t.summary)}`}
				</ThemedText>
			</View>
			<ThemedText style={labelStyle}>
				{terrainSequence(t.summary) || "목적지에 도착했습니다"}
			</ThemedText>
		</View>
	);
	return (
		<View style={{ gap: 16 }}>
			<View
				style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
			>
				<ThemedText type="smallBold">스테이지 {b.stageIndex + 1}</ThemedText>
				<ThemedText type="caption" themeColor="textSecondary">
					{statusLabel}
				</ThemedText>
			</View>
			{b.preview ? (
				<ThemedText type="small" themeColor="textSecondary">
					위치 확인 전입니다. 스테이지 시작점 기준 미리보기를 표시합니다.
				</ThemedText>
			) : null}
			<View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.separator }}>
				{b.supply ? (
					destination("다음 보급소", b.supply, theme.warning)
				) : (
					<View style={{ paddingVertical: 16 }}>
						<ThemedText type="small" themeColor="textSecondary">
							이 스테이지에 남은 보급 후보가 없습니다.
						</ThemedText>
					</View>
				)}
				{b.summit ? (
					<>
						{destination(
							b.approach ? "다음 오르막 시작" : "오르막 진행 중",
							{ ...(b.approach ?? b.summit), title: b.climbName },
							theme.tint,
						)}
						<ThemedText
							type="small"
							themeColor="textSecondary"
							style={{ paddingBottom: 18 }}
							selectable
						>
							오르막 자체 {(b.climb!.summitKm - b.climb!.startKm).toFixed(1)}km · 상승 +
							{b.climb!.gainM}m{b.climb!.summitKm > b.stageEndKm ? " · 정상은 다음 스테이지" : ""}
							{b.supply && b.climb!.summitKm <= b.supply.endKm
								? "\n보급 전에 이 오르막을 넘습니다."
								: b.supply && b.climb!.startKm < b.supply.endKm
									? "\n보급소는 오르막 중간에 있습니다."
									: ""}
						</ThemedText>
					</>
				) : (
					<ThemedText type="small" themeColor="textSecondary" style={{ paddingBottom: 16 }}>
						{b.remainingClimbs == null
							? "고도 정보가 부족해 남은 오르막을 확인할 수 없습니다."
							: "이 스테이지에 본격적인 오르막이 더 없습니다."}
					</ThemedText>
				)}
				{!b.supply && !b.summit ? destination("오늘 끝까지", b.finish, theme.tint) : null}
			</View>
			<View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{options.map((o) => (
					<Pressable
						key={o.key}
						accessibilityRole="tab"
						accessibilityState={{ selected: activeKey === o.key }}
						onPress={() => {
							setSelection(o.key);
							setExpanded(false);
						}}
						style={{
							minHeight: 44,
							justifyContent: "center",
							paddingHorizontal: 14,
							borderRadius: 12,
							borderCurve: "continuous",
							backgroundColor: activeKey === o.key ? theme.tint : theme.backgroundElement,
						}}
					>
						<ThemedText
							type="smallBold"
							style={{ color: activeKey === o.key ? "#FFFFFF" : theme.text }}
						>
							{o.label}
						</ThemedText>
					</Pressable>
				))}
			</View>
			<View style={{ gap: 10, paddingTop: 8 }}>
				<ThemedText type="headline">
					{target === b.supply ? b.supply.title : target.title}
				</ThemedText>
				<ThemedText type="small" selectable>
					{target.summary.distanceKm.toFixed(1)}km · 상승 {terrainAscent(target.summary)}
				</ThemedText>
				<View
					accessibilityLabel={terrainSequence(target.summary, 20)}
					style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden" }}
				>
					{target.summary.segments.map((s, i) => (
						<View
							key={i}
							style={{ flex: s.endKm - s.startKm, backgroundColor: TERRAIN_COLORS[s.kind] }}
						/>
					))}
				</View>
				<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
					<ThemedText type="caption" themeColor="textSecondary">
						{b.preview ? "스테이지 시작" : "현재"}
					</ThemedText>
					<ThemedText type="caption" themeColor="textSecondary">
						{target.summary.distanceKm.toFixed(1)}km
					</ThemedText>
				</View>
			</View>
			<View>
				{(expanded ? target.summary.segments : target.summary.segments.slice(0, 12)).map((s, i) => (
					<View
						key={`${target.id}-${i}`}
						style={{
							flexDirection: "row",
							alignItems: "center",
							paddingVertical: 13,
							gap: 12,
							borderBottomWidth: 0.5,
							borderColor: theme.separator,
						}}
					>
						<View
							style={{
								width: 4,
								height: 32,
								borderRadius: 2,
								backgroundColor: TERRAIN_COLORS[s.kind],
							}}
						/>
						<View style={{ flex: 1, gap: 3 }}>
							<ThemedText type="smallBold">{TERRAIN_LABELS[s.kind]}</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary">
								{b.preview ? "시작점 기준" : "현재 기준"} {(s.startKm - b.km).toFixed(1)}–
								{(s.endKm - b.km).toFixed(1)}km
							</ThemedText>
						</View>
						<View style={{ alignItems: "flex-end", gap: 3 }}>
							<ThemedText type="smallBold">{(s.endKm - s.startKm).toFixed(1)}km</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary">
								{s.kind === "unknown" ? "분석 불가" : `상승 +${Math.round(s.gainM)}m`}
							</ThemedText>
						</View>
					</View>
				))}
				{!expanded && target.summary.segments.length > 12 ? (
					<Pressable
						onPress={() => setExpanded(true)}
						style={{ minHeight: 48, justifyContent: "center" }}
					>
						<ThemedText type="linkPrimary">남은 구간 모두 보기</ThemedText>
					</Pressable>
				) : null}
			</View>
			<ThemedText type="small" themeColor="textSecondary" selectable>
				오늘 남은 오르막 {b.remainingClimbs == null ? "분석 불가" : `${b.remainingClimbs}개`} ·
				오르막 구간 상승{" "}
				{b.remainingClimbGainM == null ? "정보 없음" : `+${b.remainingClimbGainM}m`}
			</ThemedText>
		</View>
	);
}
