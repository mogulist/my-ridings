export const EVENT_TYPES = ['gran_fondo', 'ultra_race', 'running_race', 'course'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  gran_fondo: '그란폰도',
  ultra_race: '울트라레이스',
  running_race: '러닝레이스',
  course: '코스',
};

export const WAYPOINT_TYPES = [
  'start', 'finish', 'checkpoint', 'supply', 'water', 'cutoff', 'summit', 'rest',
] as const;
export type WaypointType = (typeof WAYPOINT_TYPES)[number];

export const WAYPOINT_TYPE_LABELS: Record<WaypointType, string> = {
  start: '출발',
  finish: '도착',
  checkpoint: '체크포인트',
  supply: '보급소',
  water: '워터스테이션',
  cutoff: '컷오프',
  summit: '서밋',
  rest: '휴식',
};

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  event_type: EventType;
  event_date: string;
  route_id: string | null;
  official_distance_km: number | null;
  official_elevation_m: number | null;
  search_keywords: string[] | null;
  organizer_name: string | null;
  organizer_url: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventWaypointRow = {
  id: string;
  event_id: string;
  name: string;
  waypoint_type: WaypointType;
  lat: number;
  lng: number;
  elevation_m: number | null;
  distance_from_start_km: number | null;
  cutoff_seconds_from_start: number | null;
  supplies_available: string | null;
  is_mandatory_stop: boolean;
  memo: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type EventWithWaypoints = EventRow & { waypoints: EventWaypointRow[] };
