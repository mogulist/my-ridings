import type { BriefingGeometry } from "@/app/components/plan-elevation/course-briefing/build-briefing-geometry";
import type {
	BriefingElevationSource,
	RouteOfficialSpecs,
	RouteOfficialSpecsInput,
} from "@/app/types/route";

export function parseRouteOfficialSpecs(
	row: RouteOfficialSpecsInput | null | undefined,
): RouteOfficialSpecs {
	return {
		officialDistanceKm: parseOptionalNumber(row?.official_distance_km),
		officialElevationM: parseOptionalInteger(row?.official_elevation_m),
		officialStartName: normalizeOptionalText(row?.official_start_name),
		officialFinishName: normalizeOptionalText(row?.official_finish_name),
	};
}

export function hasOfficialElevation(specs: RouteOfficialSpecs | null | undefined): boolean {
	return specs != null && specs.officialElevationM != null && specs.officialElevationM > 0;
}

export function canToggleBriefingElevationSource(
	specs: RouteOfficialSpecs | null | undefined,
	isFullRoute: boolean,
): boolean {
	return isFullRoute && hasOfficialElevation(specs);
}

export function defaultBriefingElevationSource(
	specs: RouteOfficialSpecs | null | undefined,
): BriefingElevationSource {
	return hasOfficialElevation(specs) ? "official" : "measured";
}

export function applyBriefingDisplayOverrides(
	geometry: BriefingGeometry,
	specs: RouteOfficialSpecs | null | undefined,
	source: BriefingElevationSource,
	isFullRoute: boolean,
): BriefingGeometry {
	if (!isFullRoute || source !== "official" || !specs) return geometry;

	const next: BriefingGeometry = { ...geometry };

	if (specs.officialStartName) next.startName = specs.officialStartName;
	if (specs.officialFinishName) next.endName = specs.officialFinishName;
	if (specs.officialDistanceKm != null && specs.officialDistanceKm > 0) {
		next.totalDistanceKm = specs.officialDistanceKm;
	}
	if (hasOfficialElevation(specs)) {
		next.elevationGainM = specs.officialElevationM as number;
	}

	return next;
}

function parseOptionalNumber(value: unknown): number | null {
	if (value == null || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function parseOptionalInteger(value: unknown): number | null {
	const n = parseOptionalNumber(value);
	if (n == null) return null;
	return Math.round(n);
}

function normalizeOptionalText(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}
