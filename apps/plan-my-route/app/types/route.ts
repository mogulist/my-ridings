export type RouteOfficialSpecs = {
	officialDistanceKm: number | null;
	officialElevationM: number | null;
	officialStartName: string | null;
	officialFinishName: string | null;
};

export type RouteOfficialSpecsInput = {
	official_distance_km?: number | null;
	official_elevation_m?: number | null;
	official_start_name?: string | null;
	official_finish_name?: string | null;
};

export type BriefingElevationSource = "official" | "measured";
