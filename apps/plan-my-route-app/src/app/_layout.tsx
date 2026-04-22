import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { assertPlanGeometryPackageLinked } from "@/features/plan/workspace-package-check";

assertPlanGeometryPackageLinked();

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: 1,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<AnimatedSplashOverlay />
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="login" />
					<Stack.Screen name="routes/[routeId]/plans" />
				</Stack>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
