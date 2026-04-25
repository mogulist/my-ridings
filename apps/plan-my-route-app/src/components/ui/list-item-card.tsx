import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { Radius, Shadow } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

export type ListItemCardProps = ViewProps & {
	children: ReactNode;
};

/** 스크롤 목록 한 행용: elevated 면 + 라운드 + 그림자만 (좌측 색 띠 없음). */
export function ListItemCard({ children, style, ...rest }: ListItemCardProps) {
	const theme = useTheme();
	const scheme = useColorScheme();
	const isDark = scheme === "dark";
	const boxShadow = isDark ? Shadow.cardLg : Shadow.card;

	return (
		<View
			style={[
				styles.outer,
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
});
