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
};

type RideWithGpsResponse = {
  route?: {
    track_points?: TrackPoint[];
  };
  track_points?: TrackPoint[];
};

export const fetchRoutes = async (apiOrigin: string, accessToken: string): Promise<RouteItem[]> => {
  const response = await fetch(`${apiOrigin}/api/routes`, {
    method: 'GET',
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
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`GET /api/routes/${routeId} failed (${response.status})`);
  const json = (await response.json()) as RouteDetail;
  return {
    ...json,
    plans: Array.isArray(json.plans) ? json.plans : [],
  };
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
