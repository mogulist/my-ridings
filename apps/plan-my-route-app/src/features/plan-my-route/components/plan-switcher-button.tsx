import { HeaderButton } from "@react-navigation/elements";
import { useRouter } from "expo-router";
import { ActionSheetIOS, Alert, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppIcon } from "@/components/ui/icon";
import { Spacing } from "@/constants/theme";
import { buildPlanSwitchOptions } from "@/features/plan-my-route/plan-switcher";
import { useRouteDetailQuery } from "@/features/plan-my-route/route-detail-query";
import { useTheme } from "@/hooks/use-theme";

export type PlanReviewTab = "summary" | "schedule" | "map";

type PlanSwitcherButtonProps = {
	routeId: string;
	currentPlanId: string;
	tab: PlanReviewTab;
};

export function PlanSwitcherButton({ routeId, currentPlanId, tab }: PlanSwitcherButtonProps) {
	const router = useRouter();
	const theme = useTheme();
	const { data } = useRouteDetailQuery(routeId || undefined);
	const plans = data?.plans ?? [];
	if (plans.length < 2) return null;

	const options = buildPlanSwitchOptions(plans, currentPlanId, data?.selected_plan_id);
	const navigate = (planId: string) => {
		if (planId === currentPlanId) return;
		const pathname =
			tab === "summary"
				? "/routes/[routeId]/plans/[planId]/summary"
				: tab === "schedule"
					? "/routes/[routeId]/plans/[planId]/schedule"
					: "/routes/[routeId]/plans/[planId]/map";
		router.replace({ pathname, params: { routeId, planId } });
	};

	const open = () => {
		if (process.env.EXPO_OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					title: "검토할 플랜 선택",
					options: ["취소", ...options.map((option) => option.label)],
					cancelButtonIndex: 0,
				},
				(buttonIndex) => {
					if (buttonIndex > 0) navigate(options[buttonIndex - 1]!.planId);
				},
			);
			return;
		}

		Alert.alert(
			"검토할 플랜 선택",
			undefined,
			[
				...options.map((option) => ({ text: option.label, onPress: () => navigate(option.planId) })),
				{ text: "취소", style: "cancel" as const },
			],
		);
	};

	return (
		<HeaderButton accessibilityLabel="다른 플랜으로 전환" onPress={open}>
			<View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.one }}>
				<ThemedText type="small" style={{ color: theme.tint, fontWeight: "600" }}>
					플랜
				</ThemedText>
				<AppIcon name="chevron.down" size={11} tintColor={theme.tint} />
			</View>
		</HeaderButton>
	);
}
