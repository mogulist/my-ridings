import * as Haptics from "expo-haptics";

/** 시뮬레이터·웹 등 Haptics 미지원 시 reject 되므로 삼킨다. */
export function safeImpactLight(): void {
	void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function safeSelection(): void {
	void Haptics.selectionAsync().catch(() => {});
}
