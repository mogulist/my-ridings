import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SnackbarProps = {
	message: string | null;
	durationMs?: number;
	onDismiss: () => void;
};

const DEFAULT_DURATION_MS = 3000;

export function Snackbar({ message, durationMs = DEFAULT_DURATION_MS, onDismiss }: SnackbarProps) {
	const insets = useSafeAreaInsets();
	const opacity = useRef(new Animated.Value(0)).current;
	const visible = message != null;

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
			<Animated.View style={[styles.toast, { opacity }]}>
				<ThemedText type="small" style={styles.text}>
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
		backgroundColor: 'rgba(20, 20, 22, 0.92)',
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		borderRadius: Spacing.two,
	},
	text: {
		color: '#FFFFFF',
		textAlign: 'center',
	},
});
