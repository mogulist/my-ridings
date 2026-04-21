import { Stack } from 'expo-router/stack';

import { useTheme } from '@/hooks/use-theme';

export default function RoutePlansSegmentLayout() {
	const theme = useTheme();

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackButtonDisplayMode: 'minimal',
				headerLargeTitle: false,
				headerTransparent: false,
				headerShadowVisible: false,
				headerStyle: { backgroundColor: theme.background },
				headerTintColor: theme.tint,
				headerTitleStyle: { color: theme.text },
			}}>
			<Stack.Screen name="index" options={{ title: '플랜' }} />
			<Stack.Screen name="[planId]" options={{ headerShown: false }} />
		</Stack>
	);
}
