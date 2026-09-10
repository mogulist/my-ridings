import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { supabase } from "@/features/auth/supabase-client";
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

	useEffect(() => {
		const handleAppStateChange = (state: AppStateStatus) => {
			if (state === "active") {
				supabase.auth.startAutoRefresh();
				return;
			}

			supabase.auth.stopAutoRefresh();
		};

		handleAppStateChange(AppState.currentState);
		const subscription = AppState.addEventListener("change", handleAppStateChange);

		return () => {
			subscription.remove();
			supabase.auth.stopAutoRefresh();
		};
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<AnimatedSplashOverlay />
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="login" />
					<Stack.Screen name="auth/callback" />
					<Stack.Screen name="routes/[routeId]/plans" />
				</Stack>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
