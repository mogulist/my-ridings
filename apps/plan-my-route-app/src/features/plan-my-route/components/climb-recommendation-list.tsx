import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import type { ClimbRecommendation } from "../climb-recommendations";
export function ClimbRecommendationList({
	candidates,
	onExclude,
	onSave,
	onReset,
	hasExcluded,
}: {
	candidates: ClimbRecommendation[];
	onExclude: (id: string) => void;
	onReset: () => void;
	hasExcluded: boolean;
	onSave: (item: ClimbRecommendation, name: string, summitId: string | null) => Promise<void>;
}) {
	const theme = useTheme();
	const [selected, setSelected] = useState<string | null>(null),
		[name, setName] = useState(""),
		[summitId, setSummitId] = useState<string | null>(null),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<string | null>(null);
	const button = {
		minHeight: 44,
		justifyContent: "center" as const,
		paddingHorizontal: 12,
		borderRadius: 12,
	};
	return (
		<View style={{ gap: 18 }}>
			<ThemedText type="headline">등록할 오르막 후보 {candidates.length}개</ThemedText>
			<ThemedText type="small" themeColor="textSecondary">
				고도에서 찾은 후보입니다. 실제 고개인지 확인하고 이름을 지정해 주세요. 추천 제외 후에도
				라이딩의 지형 안내는 유지됩니다.
			</ThemedText>
			{!candidates.length ? (
				<ThemedText type="small">
					추가로 추천할 오르막이 없습니다. 고도 정보가 없는 구간은 탐지할 수 없습니다.
				</ThemedText>
			) : null}
			{candidates.map((item, index) => {
				const c = item.climb;
				return (
					<View
						key={c.id}
						style={{
							gap: 12,
							padding: 18,
							borderRadius: 18,
							backgroundColor: theme.backgroundElement,
						}}
					>
						<ThemedText type="headline">오르막 후보 {index + 1}</ThemedText>
						<ThemedText type="small" selectable>
							시작 {c.startKm.toFixed(1)}km → 정상 {c.summitKm.toFixed(1)}km
						</ThemedText>
						<ThemedText type="smallBold">
							{(c.summitKm - c.startKm).toFixed(1)}km · 상승 +{Math.round(c.gainM)}m · 평균{" "}
							{c.avgGradientPct.toFixed(1)}%
						</ThemedText>
						{selected === c.id ? (
							<>
								<ThemedText type="caption" themeColor="textSecondary">
									이 플랜에서 사용할 고개 이름
								</ThemedText>
								<TextInput
									accessibilityLabel="고개 이름"
									value={name}
									onChangeText={(v) => {
										setName(v);
										setSummitId(null);
									}}
									maxLength={100}
									placeholder="고개 이름 입력"
									placeholderTextColor={theme.textSecondary}
									style={{
										minHeight: 48,
										color: theme.text,
										borderWidth: 1,
										borderColor: theme.separator,
										borderRadius: 10,
										paddingHorizontal: 12,
									}}
								/>
								{item.nearby.length ? (
									<>
										<ThemedText type="smallBold">기존 고개와 연결</ThemedText>
										{item.nearby.map((s) => (
											<Pressable
												key={s.id}
												accessibilityRole="button"
												accessibilityState={{ selected: summitId === s.id }}
												onPress={() => {
													setSummitId(s.id);
													setName(s.name);
												}}
												style={button}
											>
												<ThemedText type="small" themeColor="tint">
													{summitId === s.id ? "✓ " : ""}
													{s.name}
												</ThemedText>
											</Pressable>
										))}
									</>
								) : null}
								<Pressable
									accessibilityRole="button"
									disabled={busy || !name.trim()}
									style={{
										...button,
										backgroundColor: theme.tint,
										opacity: busy || !name.trim() ? 0.5 : 1,
									}}
									onPress={() => {
										setBusy(true);
										setError(null);
										void onSave(item, name.trim(), summitId)
											.then(() => setSelected(null))
											.catch((e) =>
												setError(e instanceof Error ? e.message : "저장하지 못했습니다."),
											)
											.finally(() => setBusy(false));
									}}
								>
									<ThemedText type="smallBold" style={{ color: "#fff" }}>
										{busy ? "저장 중…" : "이 플랜에 등록"}
									</ThemedText>
								</Pressable>
								{error ? (
									<ThemedText type="small" style={{ color: theme.danger }}>
										{error}
									</ThemedText>
								) : null}
								<Pressable
									disabled={busy}
									accessibilityRole="button"
									onPress={() => setSelected(null)}
									style={button}
								>
									<ThemedText type="small">취소</ThemedText>
								</Pressable>
							</>
						) : (
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
								<Pressable
									accessibilityRole="button"
									style={{ ...button, backgroundColor: theme.tint }}
									onPress={() => {
										setSelected(c.id);
										setName("");
										setSummitId(null);
										setError(null);
									}}
								>
									<ThemedText type="smallBold" style={{ color: "#fff" }}>
										이름 지정·등록
									</ThemedText>
								</Pressable>
								<Pressable
									accessibilityRole="button"
									onPress={() => onExclude(c.id)}
									style={button}
								>
									<ThemedText type="small" themeColor="textSecondary">
										추천에서 제외
									</ThemedText>
								</Pressable>
							</View>
						)}
					</View>
				);
			})}
			{hasExcluded ? (
				<Pressable accessibilityRole="button" style={button} onPress={onReset}>
					<ThemedText themeColor="tint" type="small">
						제외한 후보 다시 보기
					</ThemedText>
				</Pressable>
			) : null}
			<ThemedText type="caption" themeColor="textSecondary">
				거리는 전체 경로 기준입니다. 500m 이상·상승 50m 이상·평균 2% 이상인 오르막을 추천하며, 고도
				잡음·짧은 골짜기를 보정합니다.
			</ThemedText>
		</View>
	);
}
