import type { TerrainAnalysis, DetectedClimb } from "@my-ridings/plan-geometry";
import type {
	CpMarkerOnRoute,
	MobilePlanStageRow,
	SummitCatalogRow,
	SummitMarkerOnRoute,
	TrackPoint,
} from "@/features/api/plan-my-route";
export type ClimbRecommendation = {
	climb: DetectedClimb;
	point: TrackPoint;
	nearby: SummitCatalogRow[];
};
const meters = (a: TrackPoint, b: SummitCatalogRow) =>
	Math.hypot((a.y - b.lat) * 111320, (a.x - b.lng) * 111320 * Math.cos((a.y * Math.PI) / 180));
export function recommendClimbs(
	analysis: TerrainAnalysis,
	stage: MobilePlanStageRow,
	track: TrackPoint[],
	summits: SummitMarkerOnRoute[],
	cps: CpMarkerOnRoute[],
	catalog: SummitCatalogRow[],
	excluded: string[] = [],
): ClimbRecommendation[] {
	const start = (stage.start_distance ?? 0) / 1000,
		end = (stage.end_distance ?? 0) / 1000;
	return analysis.climbs
		.filter(
			(c) =>
				c.summitKm > start &&
				c.summitKm <= end &&
				!excluded.includes(c.id) &&
				![...summits, ...cps].some((s) => Math.abs(s.distanceKm - c.summitKm) <= 0.35),
		)
		.flatMap((climb) => {
			const point = track.reduce<TrackPoint | null>(
				(a, b) =>
					b.d == null
						? a
						: !a || Math.abs(b.d / 1000 - climb.summitKm) < Math.abs(a.d! / 1000 - climb.summitKm)
							? b
							: a,
				null,
			);
			if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
			return [
				{
					climb,
					point,
					nearby: catalog
						.filter((s) => meters(point, s) <= 350)
						.sort((a, b) => meters(point, a) - meters(point, b)),
				},
			];
		});
}
