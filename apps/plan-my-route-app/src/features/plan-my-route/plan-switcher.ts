import type { PlanItem } from "@/features/api/plan-my-route";

export type PlanSwitchOption = {
	planId: string;
	label: string;
};

export function buildPlanSwitchOptions(
	plans: PlanItem[],
	currentPlanId: string,
	selectedPlanId: string | null | undefined,
): PlanSwitchOption[] {
	return plans.map((plan, index) => {
		const suffixes: string[] = [];
		if (plan.id === selectedPlanId) suffixes.push("라이딩 플랜");
		if (plan.id === currentPlanId) suffixes.push("현재");
		const suffix = suffixes.length > 0 ? ` · ${suffixes.join(" · ")}` : "";
		return {
			planId: plan.id,
			label: `${index + 1}순위 · ${plan.name}${suffix}`,
		};
	});
}
