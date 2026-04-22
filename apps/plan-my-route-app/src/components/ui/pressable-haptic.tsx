import type { ReactNode } from "react";
import {
	Platform,
	Pressable,
	type PressableProps,
	type StyleProp,
	type ViewStyle,
} from "react-native";

import { safeImpactLight } from "@/lib/safe-haptics";

export type PressableHapticProps = PressableProps & {
	children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
	style?: StyleProp<ViewStyle>;
};

export function PressableHaptic({ children, onPressIn, style, ...rest }: PressableHapticProps) {
	return (
		<Pressable
			accessibilityRole={rest.accessibilityRole ?? "button"}
			style={(state) => {
				const base: ViewStyle = {
					opacity: state.pressed ? 0.92 : 1,
					transform: [{ scale: state.pressed ? 0.98 : 1 }],
				};
				const resolved = typeof style === "function" ? style(state) : style;
				return [base, resolved];
			}}
			onPressIn={(e) => {
				if (Platform.OS === "ios") {
					safeImpactLight();
				}
				onPressIn?.(e);
			}}
			{...rest}
		>
			{children}
		</Pressable>
	);
}
