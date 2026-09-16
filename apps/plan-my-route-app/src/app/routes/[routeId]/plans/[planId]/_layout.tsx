import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	PlanDetailFloatingTabs,
	type PlanDetailTabKey,
} from "@/components/plan-detail-floating-tabs";
import { HeaderBack } from "@/components/ui/header-back";
import { PlanSwitcherButton } from "@/features/plan-my-route/components/plan-switcher-button";
import { useTheme } from "@/hooks/use-theme";

function parsePlanDetailTab(pathname: string): PlanDetailTabKey | null {
	const match = pathname.match(/\/plans\/[^/]+\/(summary|schedule|map)\/?$/);
	if (!match) return null;
	return match[1] as PlanDetailTabKey;
}

function HeaderBackToPlans() {
	const router = useRouter();
	const params = useGlobalSearchParams<{ routeId?: string }>();
	const routeId = typeof params.routeId === "string" ? params.routeId : "";

	const handlePress = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}
		if (routeId) {
			router.replace({ pathname: "/routes/[routeId]/plans", params: { routeId } });
		} else {
			router.replace("/(tabs)");
		}
	};

	return <HeaderBack onPress={handlePress} accessibilityLabel="플랜 목록으로 돌아가기" />;
}

export default function PlanDetailLayout() {
	const pathname = usePathname();
	const router = useRouter();
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const params = useGlobalSearchParams<{ routeId?: string; planId?: string }>();
	const routeId = typeof params.routeId === "string" ? params.routeId : "";
	const planId = typeof params.planId === "string" ? params.planId : "";

	const tabFromPath = parsePlanDetailTab(pathname);
	const showFloatingTabs = tabFromPath !== null && routeId.length > 0 && planId.length > 0;

	const navigateTab = (tab: PlanDetailTabKey) => {
		if (!routeId || !planId) return;
		const pathname =
			tab === "summary"
				? "/routes/[routeId]/plans/[planId]/summary"
				: tab === "schedule"
					? "/routes/[routeId]/plans/[planId]/schedule"
					: "/routes/[routeId]/plans/[planId]/map";
		router.replace({
			pathname,
			params: { routeId, planId },
		});
	};

	const planDetailHeaderChrome = {
		headerLargeTitle: false,
		headerTransparent: false,
		headerShadowVisible: false,
		headerStyle: { backgroundColor: theme.background },
		headerTintColor: theme.tint,
		headerTitleStyle: { color: theme.text },
	} as const;

	const solidHeader = {
		...planDetailHeaderChrome,
		headerLeft: () => <HeaderBackToPlans />,
	} as const;

	const headerForTab = (tab: PlanDetailTabKey) => ({
		...solidHeader,
		headerRight: () =>
			routeId && planId ? (
				<PlanSwitcherButton routeId={routeId} currentPlanId={planId} tab={tab} />
			) : null,
	});

	return (
		<View style={styles.shell}>
			<Stack
				screenOptions={{
					headerShown: true,
					headerBackButtonDisplayMode: "minimal",
				}}
			>
				<Stack.Screen
					name="summary"
					options={{
						title: "요약",
						...headerForTab("summary"),
					}}
				/>
				<Stack.Screen
					name="schedule"
					options={{
						title: "일정",
						...headerForTab("schedule"),
					}}
				/>
				<Stack.Screen
					name="map"
					options={{
						title: "맵",
						...headerForTab("map"),
					}}
				/>
				<Stack.Screen
					name="note"
					options={{
						presentation: "modal",
						title: "검토 메모",
						...planDetailHeaderChrome,
					}}
				/>
				<Stack.Screen
					name="stages/[dayNumber]/index"
					options={{ title: "Stage", ...planDetailHeaderChrome }}
				/>
				<Stack.Screen
					name="stages/[dayNumber]/edit"
					options={{
						presentation: "modal",
						title: "Edit stage",
						headerLargeTitle: false,
						headerTransparent: false,
						headerShadowVisible: false,
						headerStyle: { backgroundColor: theme.background },
						headerTintColor: theme.tint,
						headerTitleStyle: { color: theme.text },
					}}
				/>
			</Stack>

			{showFloatingTabs && tabFromPath ? (
				<PlanDetailFloatingTabs
					activeTab={tabFromPath}
					bottomInset={insets.bottom}
					onSelectTab={navigateTab}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	shell: {
		flex: 1,
	},
});
