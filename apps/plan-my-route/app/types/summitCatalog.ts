export const SUMMIT_CATALOG_STATUSES = [
	"approved",
	"pending",
	"rejected",
] as const;

export type SummitCatalogStatus = (typeof SUMMIT_CATALOG_STATUSES)[number];

export type SummitCatalogRow = {
	id: string;
	name: string;
	name_normalized: string;
	lat: number;
	lng: number;
	elevation_m: number | null;
	is_official: boolean;
	status: SummitCatalogStatus;
	created_by: string | null;
	source_route_id: string | null;
	source_plan_id: string | null;
	created_at: string;
	updated_at: string;
};

export const normalizeSummitName = (name: string): string =>
	name
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
