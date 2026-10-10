import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { TERRAIN_LABELS } from "../ride-terrain-data";
import {
	DEFAULT_TERRAIN_SPEEDS,
	SPEED_TERRAINS,
	parseTerrainSpeeds,
	type TerrainSpeeds,
} from "../terrain-time";
export function TerrainSpeedEditor({
	speeds,
	ready,
	onSave,
	loadError,
}: {
	speeds: TerrainSpeeds;
	ready: boolean;
	onSave: (speeds: TerrainSpeeds) => Promise<void>;
	loadError: string | null;
}) {
	const theme = useTheme(),
		[open, setOpen] = useState(false),
		[draft, setDraft] = useState<Record<string, string>>({}),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<string | null>(null);
	const toDraft = (v: TerrainSpeeds) =>
		Object.fromEntries(SPEED_TERRAINS.map((k) => [k, String(v[k])]));
	const button = {
		minHeight: 44,
		justifyContent: "center" as const,
		paddingHorizontal: 12,
		borderRadius: 12,
	};
	return (
		<View style={{ gap: 12 }}>
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				disabled={!ready || busy}
				style={button}
				onPress={() => {
					if (!open) setDraft(toDraft(speeds));
					setError(null);
					setOpen(!open);
				}}
			>
				<ThemedText type="smallBold" themeColor="tint">
					{open ? "속도 기준 닫기" : "예상 시간의 속도 기준 조정"}
				</ThemedText>
			</Pressable>
			<ThemedText type="caption" themeColor="textSecondary">
				지형별 거리 ÷ 설정 속도로 계산한 주행 시간입니다. 휴식·바람·피로를 포함한 도착 시각은
				아닙니다.
			</ThemedText>
			{loadError ? (
				<ThemedText type="caption" themeColor="textSecondary">
					{loadError}
				</ThemedText>
			) : null}
			{open ? (
				<View
					style={{
						padding: 18,
						gap: 12,
						borderRadius: 18,
						backgroundColor: theme.backgroundElement,
					}}
				>
					<ThemedText type="headline">나의 예상 주행 속도</ThemedText>
					{SPEED_TERRAINS.map((kind) => (
						<View
							key={kind}
							style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}
						>
							<ThemedText type="small" style={{ flex: 1, minWidth: 110 }}>
								{TERRAIN_LABELS[kind]}
							</ThemedText>
							<TextInput
								accessibilityLabel={`${TERRAIN_LABELS[kind]} 예상 속도 km/h`}
								value={draft[kind] ?? ""}
								onChangeText={(v) => setDraft({ ...draft, [kind]: v })}
								keyboardType="decimal-pad"
								editable={!busy}
								style={{
									color: theme.text,
									minHeight: 48,
									width: 76,
									textAlign: "right",
									paddingHorizontal: 12,
									borderWidth: 1,
									borderColor: theme.separator,
									borderRadius: 10,
								}}
							/>
							<ThemedText type="caption">km/h</ThemedText>
						</View>
					))}
					{error ? (
						<ThemedText type="small" style={{ color: theme.danger }}>
							{error}
						</ThemedText>
					) : null}
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						<Pressable
							accessibilityRole="button"
							disabled={busy}
							style={{ ...button, backgroundColor: theme.tint }}
							onPress={() => {
								const values = Object.fromEntries(
									SPEED_TERRAINS.map((k) => [
										k,
										/^\d+(?:\.\d+)?$/.test(draft[k] ?? "") ? Number(draft[k]) : NaN,
									]),
								);
								const parsed = parseTerrainSpeeds(values);
								if (!parsed) {
									setError("각 속도를 1–80km/h 범위로 입력해 주세요.");
									return;
								}
								setBusy(true);
								setError(null);
								void onSave(parsed)
									.then(() => setOpen(false))
									.catch(() => setError("속도를 저장하지 못했습니다. 다시 시도해 주세요."))
									.finally(() => setBusy(false));
							}}
						>
							<ThemedText type="smallBold" style={{ color: "#fff" }}>
								{busy ? "저장 중…" : "속도 기준 저장"}
							</ThemedText>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							disabled={busy}
							style={button}
							onPress={() => setDraft(toDraft(DEFAULT_TERRAIN_SPEEDS))}
						>
							<ThemedText type="small">기본값으로</ThemedText>
						</Pressable>
					</View>
				</View>
			) : null}
		</View>
	);
}
