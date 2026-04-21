import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SnackbarProps = {
	message: string | null;
	durationMs?: number;
	onDismiss: () => void;
};

const DEFAULT_DURATION_MS = 3000;

export function Snackbar({ message, durationMs = DEFAULT_DURATION_MS, onDismiss }: SnackbarProps) {
	const insets = useSafeAreaInsets();
	const colorScheme = useColorScheme();
	const opacity = useRef(new Animated.Value(0)).current;
	const visible = message != null;

	const isDark = colorScheme === 'dark';
	const bg =
		isDark
			? 'rgba(44, 44, 46, 0.94)'
			: 'rgba(28, 28, 30, 0.92)';
	const textColor = '#FFFFFF';

	useEffect(() => {
		if (!visible) return;
		Animated.timing(opacity, {
			toValue: 1,
			duration: 180,
			easing: Easing.out(Easing.quad),
			useNativeDriver: true,
		}).start();

		const timer = setTimeout(() => {
			Animated.timing(opacity, {
				toValue: 0,
				duration: 180,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}).start(() => {
				onDismiss();
			});
		}, durationMs);

		return () => {
			clearTimeout(timer);
		};
	}, [durationMs, message, onDismiss, opacity, visible]);

	if (!visible) return null;

	return (
		<View pointerEvents="none" style={[styles.wrap, { paddingBottom: insets.bottom + Spacing.three }]}>
			<Animated.View
				style={[
					styles.toast,
					{
						opacity,
						backgroundColor: bg,
						boxShadow: isDark ? Shadow.floatingDark : Shadow.floating,
					},
				]}>
				<ThemedText type="small" style={[styles.text, { color: textColor }]}>
					{message}
				</ThemedText>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		paddingHorizontal: Spacing.four,
	},
	toast: {
		maxWidth: 480,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two + 2,
		borderRadius: Radius.lg,
		borderCurve: 'continuous',
	},
	text: {
		textAlign: 'center',
	},
});
