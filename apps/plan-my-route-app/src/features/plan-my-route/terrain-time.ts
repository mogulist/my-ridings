import type { TerrainKind, TerrainSummary } from "@my-ridings/plan-geometry";
export type SpeedTerrain = Exclude<TerrainKind, "unknown">;
export type TerrainSpeeds = Record<SpeedTerrain, number>;
export const DEFAULT_TERRAIN_SPEEDS: TerrainSpeeds = {
	flat: 22,
	"gentle-descent": 25,
	descent: 28,
	rolling: 18,
	uphill: 10,
	climb: 10,
};
export const SPEED_TERRAINS = Object.keys(DEFAULT_TERRAIN_SPEEDS) as SpeedTerrain[];
export function parseTerrainSpeeds(value: unknown): TerrainSpeeds | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const object = value as Record<string, unknown>,
		result = {} as TerrainSpeeds;
	for (const kind of SPEED_TERRAINS) {
		const speed = object[kind];
		if (typeof speed !== "number" || !Number.isFinite(speed) || speed < 1 || speed > 80)
			return null;
		result[kind] = speed;
	}
	return result;
}
/** Moving time only: sum each terrain distance / configured speed. No arrival-clock prediction. */
export function estimateTerrainMinutes(
	summary: TerrainSummary,
	speeds: TerrainSpeeds,
): number | null {
	if (!parseTerrainSpeeds(speeds) || summary.distanceKm < 0 || !Number.isFinite(summary.distanceKm))
		return null;
	if (summary.distanceKm > 0 && !summary.segments.length) return null;
	let minutes = 0;
	for (const s of summary.segments) {
		const distance = s.endKm - s.startKm;
		if (!Number.isFinite(distance) || distance < 0) return null;
		if (distance === 0) continue;
		if (s.kind === "unknown") return null;
		minutes += (distance / speeds[s.kind]) * 60;
	}
	return minutes;
}
export function terrainTimeLabel(minutes: number | null): string {
	if (minutes == null) return "지형 정보 부족으로 예상 시간 계산 불가";
	const rounded = Math.max(0, Math.ceil(minutes)),
		hours = Math.floor(rounded / 60),
		rest = rounded % 60;
	return `약 ${hours ? `${hours}시간${rest ? " " : ""}` : ""}${!hours || rest ? `${rest}분` : ""}`;
}
