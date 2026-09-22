import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { PressableHaptic } from "@/components/ui/pressable-haptic";
import { Radius, Shadow, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type StageFocus = "ride" | "stay" | "route";

export type StageFocusTabsProps = {
	value: StageFocus;
	onChange: (value: StageFocus) => void;
};

const TABS: { value: StageFocus; label: string; icon: string }[] = [
	{ value: "ride", label: "라이딩", icon: "bicycle" },
	{ value: "stay", label: "숙박", icon: "bed.double.fill" },
	{ value: "route", label: "경로", icon: "map.fill" },
];

export function StageFocusTabs({ value, onChange }: StageFocusTabsProps) {
	const theme = useTheme();

	return (
		<View
			accessibilityRole="tablist"
			style={[styles.container, { backgroundColor: theme.backgroundElement }]}
		>
			{TABS.map((tab) => {
				const selected = value === tab.value;
				return (
					<PressableHaptic
						key={tab.value}
						accessibilityRole="tab"
						accessibilityLabel={`${tab.label} 정보 보기`}
						accessibilityState={{ selected }}
						style={[
							styles.tab,
							selected && {
								backgroundColor: theme.surfaceElevated,
								boxShadow: Shadow.card,
							},
						]}
						onPress={() => onChange(tab.value)}
					>
						<AppIcon
							name={tab.icon}
							size={17}
							tintColor={selected ? theme.tint : theme.textSecondary}
						/>
						<ThemedText
							type="smallBold"
							themeColor={selected ? "tint" : "textSecondary"}
						>
							{tab.label}
						</ThemedText>
					</PressableHaptic>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		borderRadius: Radius.md,
		borderCurve: "continuous",
		padding: Spacing.one,
		gap: Spacing.one,
	},
	tab: {
		flex: 1,
		minHeight: 44,
		borderRadius: Radius.sm,
		borderCurve: "continuous",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.two,
	},
});
