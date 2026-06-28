import { assertSummitAdmin, parseNumber, normalizeOptionalText } from "@/app/api/summits/shared";
import type { EventType, WaypointType, WAYPOINT_TYPES, EVENT_TYPES } from "@/app/types/event";

export { assertSummitAdmin, parseNumber, normalizeOptionalText };

export const EVENT_SELECT_COLS =
  "id, name, description, event_type, event_date, route_id, official_distance_km, official_elevation_m, search_keywords, organizer_name, organizer_url, is_public, created_by, created_at, updated_at";

export const WAYPOINT_SELECT_COLS =
  "id, event_id, name, waypoint_type, lat, lng, elevation_m, distance_from_start_km, cutoff_seconds_from_start, supplies_available, is_mandatory_stop, memo, order_index, created_at, updated_at";

const VALID_EVENT_TYPES: readonly string[] = ['gran_fondo', 'ultra_race', 'running_race', 'course'];
const VALID_WAYPOINT_TYPES: readonly string[] = [
  'start', 'finish', 'checkpoint', 'supply', 'water', 'cutoff', 'summit', 'rest',
];

export const isValidEventType = (v: unknown): v is EventType =>
  typeof v === "string" && VALID_EVENT_TYPES.includes(v);

export const isValidWaypointType = (v: unknown): v is WaypointType =>
  typeof v === "string" && VALID_WAYPOINT_TYPES.includes(v);
