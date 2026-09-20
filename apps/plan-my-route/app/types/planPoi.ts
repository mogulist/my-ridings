export const PLAN_POI_TYPES = [
  "convenience",
  "mart",
  "accommodation",
  "cafe",
  "restaurant",
] as const;

export type PlanPoiType = (typeof PLAN_POI_TYPES)[number];

export const PLAN_POI_ASSIGNMENT_MODES = ["stage", "distance", "plan"] as const;
export type PlanPoiAssignmentMode = (typeof PLAN_POI_ASSIGNMENT_MODES)[number];

export const PLAN_POI_INTENTS = ["candidate", "planned", "confirmed"] as const;
export type PlanPoiIntent = (typeof PLAN_POI_INTENTS)[number];

export type PlanPoiRow = {
  id: string;
  plan_id: string;
  kakao_place_id: string | null;
  name: string;
  poi_type: string;
  memo: string | null;
  lat: number;
  lng: number;
  assignment_mode: PlanPoiAssignmentMode;
  stage_id: string | null;
  intent: PlanPoiIntent;
  phone: string | null;
  address_name: string | null;
  place_url: string | null;
  created_at: string;
  updated_at: string;
};

export function isPlanPoiType(v: string): v is PlanPoiType {
  return (PLAN_POI_TYPES as readonly string[]).includes(v);
}

export function isPlanPoiAssignmentMode(v: string): v is PlanPoiAssignmentMode {
  return (PLAN_POI_ASSIGNMENT_MODES as readonly string[]).includes(v);
}

export function isPlanPoiIntent(v: string): v is PlanPoiIntent {
  return (PLAN_POI_INTENTS as readonly string[]).includes(v);
}

export function safePlanPoiExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
