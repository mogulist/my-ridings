import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { Radius, Shadow } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

export type ListItemCardProps = ViewProps & {
	children: ReactNode;
	/**
	 * `column`(기본): 자식이 가로 전체를 쓰도록 stretch.
	 * `row`: 본문 + 우측 버튼 등 가로 배치(일정 스테이지 카드).
	 */
	layout?: "column" | "row";
};

/** 스크롤 목록 한 행용: elevated 면 + 라운드 + 그림자만 (좌측 색 띠 없음). */
export function ListItemCard({ children, layout = "column", style, ...rest }: ListItemCardProps) {
	const theme = useTheme();
	const scheme = useColorScheme();
	const isDark = scheme === "dark";
	const boxShadow = isDark ? Shadow.cardLg : Shadow.card;

	return (
		<View
			style={[
				styles.outer,
				layout === "row" && styles.outerRow,
				{
					backgroundColor: theme.surfaceElevated,
					boxShadow,
				},
				style,
			]}
			{...rest}
		>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	outer: {
		alignSelf: "stretch",
		width: "100%",
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		overflow: "hidden",
	},
	outerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
});
