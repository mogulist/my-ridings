import {
	alongForecastResponseSchema,
	stageBriefingResponseSchema,
	type StageBriefingResponse,
} from "@my-ridings/weather-types";

import { alongForecastToStageBriefing } from "@/features/plan-my-route/legacy-to-stage-briefing";

export type RouteItem = {
	id: string;
	name: string;
	rwgps_url?: string | null;
	created_at?: string;
};

export type PlanItem = {
	id: string;
	name: string;
	created_at?: string;
	start_date?: string | null;
	sort_order?: number | null;
	is_favorite?: boolean;
	isFavorite?: boolean;
	favorite?: boolean;
};

export type RouteDetail = RouteItem & {
	plans: PlanItem[];
};

export type TrackPoint = {
	x: number;
	y: number;
	e?: number;
	d?: number;
};

export type MobilePlanStageRow = {
	id: string;
	title: string | null;
	start_distance: number | null;
	end_distance: number | null;
	elevation_gain: number | null;
	elevation_loss: number | null;
	memo: string | null;
	start_name: string | null;
	end_name: string | null;
};

export type MobilePlanSummary = {
	id: string;
	name: string;
	start_date: string | null;
	public_share_token: string;
	shared_at: string | null;
	schedule_marker_memos?: Record<string, string> | null;
};

export type MobileRouteSummary = {
	name: string;
	rwgps_url: string;
	total_distance: number | null;
	elevation_gain: number | null;
	elevation_loss: number | null;
	cover_image_hero_url: string | null;
	cover_image_og_url: string | null;
};

export type PlanPoiRow = {
	id: string;
	plan_id: string;
	kakao_place_id: string | null;
	name: string;
	poi_type: string;
	memo: string | null;
	lat: number;
	lng: number;
	created_at: string;
	updated_at: string;
};

/** 서버 summit_catalog 행 서브셋 (모바일 상세 응답용) */
export type SummitCatalogRow = {
	id: string;
	name: string;
	lat: number;
	lng: number;
	elevation_m: number | null;
};

export type CpMarkerOnRoute = {
	id: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type SummitMarkerOnRoute = {
	id: string;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type PlanDetail = {
	plan: MobilePlanSummary;
	route: MobileRouteSummary;
	stages: MobilePlanStageRow[];
	planPois: PlanPoiRow[];
	trackPoints: TrackPoint[];
	officialSummits: SummitCatalogRow[];
	cpMarkers: CpMarkerOnRoute[];
	summitMarkers: SummitMarkerOnRoute[];
	knownRouteElevationGainM: number;
};

type RideWithGpsResponse = {
	route?: {
		track_points?: TrackPoint[];
	};
	track_points?: TrackPoint[];
};

export const fetchRoutes = async (apiOrigin: string, accessToken: string): Promise<RouteItem[]> => {
	const response = await fetch(`${apiOrigin}/api/routes`, {
		method: "GET",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new Error(`GET /api/routes failed (${response.status})`);
	const json = (await response.json()) as RouteItem[];
	return Array.isArray(json) ? json : [];
};

export const fetchRouteDetail = async (
	apiOrigin: string,
	accessToken: string,
	routeId: string,
): Promise<RouteDetail> => {
	const response = await fetch(`${apiOrigin}/api/routes/${routeId}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new Error(`GET /api/routes/${routeId} failed (${response.status})`);
	const json = (await response.json()) as RouteDetail;
	return {
		...json,
		plans: Array.isArray(json.plans) ? json.plans : [],
	};
};

export type PlanStageForecastBody = {
	dayNumber: number;
};

export const fetchPlanStageForecastAlong = async (
	apiOrigin: string,
	accessToken: string,
	planId: string,
	body: PlanStageForecastBody,
): Promise<StageBriefingResponse> => {
	const response = await fetch(`${apiOrigin}/api/mobile/plans/${planId}/forecast-along`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		let message = `POST /api/mobile/plans/${planId}/forecast-along failed (${response.status})`;
		try {
			const errJson = (await response.json()) as { error?: string };
			if (typeof errJson.error === "string" && errJson.error.trim()) message = errJson.error.trim();
		} catch {
			/* ignore body parse errors */
		}
		throw new Error(message);
	}
	const json: unknown = await response.json();
	const stage = stageBriefingResponseSchema.safeParse(json);
	if (stage.success) return stage.data;
	const along = alongForecastResponseSchema.safeParse(json);
	if (along.success) {
		return alongForecastToStageBriefing(along.data);
	}
	throw new Error("Invalid weather response");
};

export const fetchPlanDetail = async (
	apiOrigin: string,
	accessToken: string,
	planId: string,
): Promise<PlanDetail> => {
	const response = await fetch(`${apiOrigin}/api/mobile/plans/${planId}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) {
		let message = `GET /api/mobile/plans/${planId} failed (${response.status})`;
		try {
			const errJson = (await response.json()) as { error?: string };
			if (typeof errJson.error === "string" && errJson.error.trim()) message = errJson.error.trim();
		} catch {
			/* ignore body parse errors */
		}
		throw new Error(message);
	}
	return (await response.json()) as PlanDetail;
};

export type PutStageBody = {
	memo?: string | null;
	start_name?: string | null;
	end_name?: string | null;
};

export const putStage = async (
	apiOrigin: string,
	accessToken: string,
	stageId: string,
	body: PutStageBody,
): Promise<void> => {
	const response = await fetch(`${apiOrigin}/api/stages/${stageId}`, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		let message = `PUT /api/stages/${stageId} failed (${response.status})`;
		try {
			const errJson = (await response.json()) as { error?: string };
			if (typeof errJson.error === "string" && errJson.error.trim()) message = errJson.error.trim();
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}
};

export const patchPlanPoi = async (
	apiOrigin: string,
	accessToken: string,
	planId: string,
	poiId: string,
	body: { memo?: string | null },
): Promise<PlanPoiRow> => {
	const response = await fetch(`${apiOrigin}/api/plans/${planId}/pois/${poiId}`, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		let message = `PATCH /api/plans/${planId}/pois/${poiId} failed (${response.status})`;
		try {
			const errJson = (await response.json()) as { error?: string };
			if (typeof errJson.error === "string" && errJson.error.trim()) message = errJson.error.trim();
		} catch {
			/* ignore */
		}
		throw new Error(message);
	}
	return (await response.json()) as PlanPoiRow;
};

export const fetchRideWithGpsTrackPoints = async (
	apiOrigin: string,
	routeUrl: string | null | undefined,
): Promise<TrackPoint[]> => {
	const routeIdMatch = routeUrl?.match(/\/routes\/(\d+)/);
	const rideWithGpsRouteId = routeIdMatch?.[1];
	if (!rideWithGpsRouteId) return [];

	const response = await fetch(`${apiOrigin}/api/ridewithgps?routeId=${rideWithGpsRouteId}`);
	if (!response.ok) throw new Error(`GET /api/ridewithgps failed (${response.status})`);
	const json = (await response.json()) as RideWithGpsResponse;
	const trackPoints = json.route?.track_points ?? json.track_points ?? [];
	return Array.isArray(trackPoints) ? trackPoints : [];
};

export const getFavoritePlans = (routeDetails: RouteDetail[]) =>
	routeDetails.flatMap((route) =>
		route.plans
			.filter((plan) => plan.is_favorite || plan.isFavorite || plan.favorite)
			.map((plan) => ({
				routeId: route.id,
				routeName: route.name,
				planId: plan.id,
				planName: plan.name,
			})),
	);
