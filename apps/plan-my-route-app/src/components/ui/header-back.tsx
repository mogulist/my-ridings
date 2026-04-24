import { Pressable, StyleSheet } from "react-native";

import { AppIcon } from "@/components/ui/icon";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { safeImpactLight } from "@/lib/safe-haptics";

export type HeaderBackProps = {
	onPress: () => void;
	accessibilityLabel?: string;
};

const DEFAULT_ACCESSIBILITY_LABEL = "뒤로 가기";

export function HeaderBack({ onPress, accessibilityLabel }: HeaderBackProps) {
	const theme = useTheme();

	const handlePress = () => {
		if (process.env.EXPO_OS === "ios") safeImpactLight();
		onPress();
	};

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? DEFAULT_ACCESSIBILITY_LABEL}
			hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
			onPress={handlePress}
			style={styles.root}
		>
			<AppIcon name="chevron.left" size={20} tintColor={theme.tint} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing.two,
		paddingRight: Spacing.two,
		minHeight: 44,
		minWidth: 44,
		justifyContent: "center",
	},
});
