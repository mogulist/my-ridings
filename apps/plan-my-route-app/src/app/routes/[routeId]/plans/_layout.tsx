import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function RoutePlansSegmentLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackButtonDisplayMode: 'minimal',
			}}>
			<Stack.Screen
				name="index"
				options={{
					title: '플랜',
					headerLargeTitle: true,
					headerTransparent: true,
					...(Platform.OS === 'ios'
						? { headerBlurEffect: 'systemMaterial' as const }
						: {}),
				}}
			/>
			<Stack.Screen name="[planId]" options={{ headerShown: false }} />
		</Stack>
	);
}
