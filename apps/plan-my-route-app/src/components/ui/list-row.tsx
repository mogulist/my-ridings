import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { AppIcon } from "./icon";

export type ListRowProps = {
	label: string;
	value?: ReactNode;
	/** SF Symbol 이름 */
	iconName?: string;
	showChevron?: boolean;
	isLast?: boolean;
	onPress?: () => void;
	valueSelectable?: boolean;
};

export function ListRow({
	label,
	value,
	iconName,
	showChevron,
	isLast,
	onPress,
	valueSelectable,
}: ListRowProps) {
	const theme = useTheme();

	const inner = (
		<>
			{iconName ? (
				<View style={styles.iconSlot}>
					<AppIcon name={iconName} size={20} tintColor={theme.tint} />
				</View>
			) : null}
			<ThemedText type="default" style={styles.label} numberOfLines={1}>
				{label}
			</ThemedText>
			<View style={styles.valueSlot}>
				{typeof value === "string" || typeof value === "number" ? (
					<ThemedText
						type="default"
						selectable={valueSelectable}
						style={[styles.value, { fontVariant: ["tabular-nums"] }]}
					>
						{value}
					</ThemedText>
				) : (
					value
				)}
				{showChevron ? (
					<AppIcon name="chevron.right" size={14} tintColor={theme.textSecondary} />
				) : null}
			</View>
		</>
	);

	const row = (
		<View
			style={[
				styles.row,
				!isLast && {
					borderBottomWidth: StyleSheet.hairlineWidth,
					borderBottomColor: theme.separator,
				},
			]}
		>
			{inner}
		</View>
	);

	if (onPress) {
		return (
			<Pressable
				accessibilityRole="button"
				onPress={onPress}
				style={({ pressed }) => [pressed && styles.pressed]}
			>
				{row}
			</Pressable>
		);
	}

	return row;
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		minHeight: 44,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		gap: Spacing.two,
	},
	pressed: {
		opacity: 0.85,
	},
	iconSlot: {
		width: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		flex: 1,
		minWidth: 0,
	},
	valueSlot: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.one,
		maxWidth: "58%",
		flexShrink: 1,
	},
	value: {
		textAlign: "right",
	},
});
