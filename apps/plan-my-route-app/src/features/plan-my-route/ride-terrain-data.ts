import {
	analyzeTerrain,
	nextTerrainClimb,
	planPoiBelongsToStage,
	summarizeTerrain,
	type DetectedClimb,
	type TerrainAnalysis,
	type TerrainKind,
	type TerrainSummary,
} from "@my-ridings/plan-geometry";
import type { PlanDetail, SummitMarkerOnRoute } from "@/features/api/plan-my-route";
import {
	prepareRideSupplyPlan,
	type RideSupplyPlan,
} from "@/features/live-activity/ride-supply-plan";

export type RideTerrainPlan = RideSupplyPlan & {
	terrain: TerrainAnalysis;
	summitMarkers: SummitMarkerOnRoute[];
};
export type RideTerrainTarget = {
	id: string;
	title: string;
	endKm: number;
	summary: TerrainSummary;
};
export type RideTerrainBriefing = {
	km: number;
	stageIndex: number;
	preview: boolean;
	stageEndKm: number;
	supply: RideTerrainTarget | null;
	climb: DetectedClimb | null;
	climbName: string;
	approach: RideTerrainTarget | null;
	summit: RideTerrainTarget | null;
	finish: RideTerrainTarget;
	remainingClimbs: number | null;
	remainingClimbGainM: number | null;
};
export const TERRAIN_LABELS: Record<TerrainKind, string> = {
	flat: "평지",
	"gentle-descent": "약내리막",
	descent: "내리막",
	rolling: "낙타등",
	uphill: "완만한 오르막",
	climb: "오르막",
	unknown: "고도 정보 없음",
};
export function terrainSequence(summary: TerrainSummary, max = 3): string {
	const kinds = summary.segments.map((s) => TERRAIN_LABELS[s.kind]);
	return kinds.slice(0, max).join(" → ") + (kinds.length > max ? " …" : "");
}
export function terrainAscent(summary: TerrainSummary): string {
	return summary.gainM == null ? "고도 정보 없음" : `+${summary.gainM.toLocaleString()}m`;
}
export function prepareRideTerrainPlan(detail: PlanDetail): RideTerrainPlan {
	const plan = prepareRideSupplyPlan(detail);
	return {
		...plan,
		terrain: plan.terrain ?? analyzeTerrain(detail.trackPoints),
		summitMarkers: detail.summitMarkers ?? [],
	};
}
export function buildRideTerrainBriefing(
	plan: RideTerrainPlan,
	currentKm: number | null,
	previewStageIndex = 0,
): RideTerrainBriefing | null {
	const preview = currentKm == null || !Number.isFinite(currentKm);
	const stageIndex = preview
		? previewStageIndex
		: plan.stages.findIndex(
				(s, i) =>
					currentKm! >= s.startDistanceKm &&
					(currentKm! < s.endDistanceKm ||
						(i === plan.stages.length - 1 && currentKm! <= s.endDistanceKm + 0.05)),
			);
	const stage = plan.stages[stageIndex];
	if (!stage) return null;
	const km = preview ? stage.startDistanceKm : Math.min(currentKm!, stage.endDistanceKm);
	const target = (id: string, title: string, endKm: number): RideTerrainTarget => ({
		id,
		title,
		endKm,
		summary: summarizeTerrain(plan.terrain, km, Math.max(km, endKm)),
	});
	const stop = plan.stops.find((s) => s.distanceKm >= km - 0.05 && planPoiBelongsToStage(s, stage));
	const climb = nextTerrainClimb(plan.terrain, km, stage.endDistanceKm);
	const marker = climb
		? plan.summitMarkers
				.filter((m) => Math.abs(m.distanceKm - climb.summitKm) < 0.35)
				.sort(
					(a, b) =>
						Math.abs(a.distanceKm - climb.summitKm) - Math.abs(b.distanceKm - climb.summitKm),
				)[0]
		: null;
	const remaining = plan.terrain.climbs.filter(
		(c) => c.summitKm > km + 0.05 && c.startKm < stage.endDistanceKm,
	);
	const remainingSummaries = remaining.map((c) =>
		summarizeTerrain(
			plan.terrain,
			Math.max(km, c.startKm),
			Math.min(stage.endDistanceKm, c.summitKm),
		),
	);
	return {
		km,
		stageIndex,
		preview,
		stageEndKm: stage.endDistanceKm,
		supply: stop ? target(stop.id, stop.name, stop.distanceKm) : null,
		climb,
		climbName: marker?.name ?? "미등록 오르막",
		approach:
			climb && climb.startKm > km
				? target(`${climb.id}-approach`, "오르막 시작까지", climb.startKm)
				: null,
		summit: climb ? target(climb.id, "정상까지", climb.summitKm) : null,
		finish: target(stage.id, "스테이지 종료점까지", stage.endDistanceKm),
		remainingClimbs: summarizeTerrain(plan.terrain, km, stage.endDistanceKm).distances.unknown
			? null
			: remaining.length,
		remainingClimbGainM:
			summarizeTerrain(plan.terrain, km, stage.endDistanceKm).distances.unknown ||
			remainingSummaries.some((s) => s.gainM == null)
				? null
				: remainingSummaries.reduce((sum, s) => sum + s.gainM!, 0),
	};
}
