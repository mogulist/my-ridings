import type { MobilePlanStageRow, PlanItem } from "@/features/api/plan-my-route";

export type PlanComparisonStage = {
	dayNumber: number;
	distanceKm: number;
	elevationGainM: number;
	endName: string | null;
};

export type PlanComparisonSummary = {
	dayCount: number;
	totalDistanceKm: number;
	totalElevationGainM: number;
	stages: PlanComparisonStage[];
};

export function buildPlanComparisonSummary(plan: PlanItem): PlanComparisonSummary {
	const sortedStages = [...(plan.stages ?? [])].sort(compareStageStart);
	const stages = sortedStages.map((stage, index) => ({
		dayNumber: index + 1,
		distanceKm: stageDistanceKm(stage),
		elevationGainM: Math.max(0, Math.round(Number(stage.elevation_gain) || 0)),
		endName: nonEmpty(stage.end_name),
	}));

	return {
		dayCount: stages.length,
		totalDistanceKm: stages.reduce((sum, stage) => sum + stage.distanceKm, 0),
		totalElevationGainM: stages.reduce((sum, stage) => sum + stage.elevationGainM, 0),
		stages,
	};
}

function compareStageStart(a: MobilePlanStageRow, b: MobilePlanStageRow): number {
	return (Number(a.start_distance) || 0) - (Number(b.start_distance) || 0);
}

function stageDistanceKm(stage: MobilePlanStageRow): number {
	const startM = Number(stage.start_distance) || 0;
	const endM = Number(stage.end_distance) || startM;
	return Math.max(0, endM - startM) / 1000;
}

function nonEmpty(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}
