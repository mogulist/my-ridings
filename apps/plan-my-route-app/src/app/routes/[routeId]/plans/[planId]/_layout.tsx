import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
	PlanDetailFloatingTabs,
	type PlanDetailTabKey,
} from '@/components/plan-detail-floating-tabs';

function parsePlanDetailTab(pathname: string): PlanDetailTabKey | null {
	const match = pathname.match(/\/plans\/[^/]+\/(summary|schedule|map)\/?$/);
	if (!match) return null;
	return match[1] as PlanDetailTabKey;
}

export default function PlanDetailLayout() {
	const pathname = usePathname();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useGlobalSearchParams<{ routeId?: string; planId?: string }>();
	const routeId = typeof params.routeId === 'string' ? params.routeId : '';
	const planId = typeof params.planId === 'string' ? params.planId : '';

	const tabFromPath = parsePlanDetailTab(pathname);
	const showFloatingTabs = tabFromPath !== null && routeId.length > 0 && planId.length > 0;

	const navigateTab = (tab: PlanDetailTabKey) => {
		if (!routeId || !planId) return;
		const pathname =
			tab === 'summary'
				? '/routes/[routeId]/plans/[planId]/summary'
				: tab === 'schedule'
					? '/routes/[routeId]/plans/[planId]/schedule'
					: '/routes/[routeId]/plans/[planId]/map';
		router.replace({
			pathname,
			params: { routeId, planId },
		});
	};

	return (
		<View style={styles.shell}>
			<Stack screenOptions={{ headerShown: true }}>
				<Stack.Screen name="summary" options={{ title: '요약' }} />
				<Stack.Screen name="schedule" options={{ title: '일정' }} />
				<Stack.Screen name="map" options={{ title: '맵' }} />
				<Stack.Screen name="stages/[dayNumber]/index" options={{ title: '스테이지' }} />
				<Stack.Screen
					name="stages/[dayNumber]/edit"
					options={{ presentation: 'modal', title: '스테이지 편집' }}
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
