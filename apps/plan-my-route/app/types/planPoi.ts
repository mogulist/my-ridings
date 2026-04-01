export const PLAN_POI_TYPES = [
  "convenience",
  "mart",
  "accommodation",
  "cafe",
  "restaurant",
] as const;

export type PlanPoiType = (typeof PLAN_POI_TYPES)[number];

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

export function isPlanPoiType(v: string): v is PlanPoiType {
  return (PLAN_POI_TYPES as readonly string[]).includes(v);
}
