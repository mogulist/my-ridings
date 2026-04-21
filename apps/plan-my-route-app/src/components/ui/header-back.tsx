import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { safeImpactLight } from '@/lib/safe-haptics';

export type HeaderBackProps = {
	label: string;
	onPress: () => void;
	accessibilityLabel?: string;
};

export function HeaderBack({ label, onPress, accessibilityLabel }: HeaderBackProps) {
	const theme = useTheme();

	const handlePress = () => {
		if (process.env.EXPO_OS === 'ios') safeImpactLight();
		onPress();
	};

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? `${label}으로 돌아가기`}
			hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
			onPress={handlePress}
			style={styles.root}>
			<AppIcon name="chevron.left" size={20} tintColor={theme.tint} />
			<ThemedText style={styles.label} themeColor="text">
				{label}
			</ThemedText>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	root: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.half,
		paddingVertical: Spacing.two,
		paddingRight: Spacing.two,
		minHeight: 44,
		justifyContent: 'center',
	},
	label: {
		fontSize: 17,
		fontWeight: '400',
	},
});
