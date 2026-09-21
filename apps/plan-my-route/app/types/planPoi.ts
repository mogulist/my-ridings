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

export const PLAN_POI_INTENT_LABELS: Record<PlanPoiIntent, string> = {
  candidate: "후보",
  planned: "선택",
  confirmed: "확정",
};

export const PLAN_POI_BOOKING_METHODS = [
  "unconfirmed",
  "naver",
  "secretmall",
  "yeogi",
  "agoda",
  "phone",
  "walk_in",
  "other",
] as const;
export type PlanPoiBookingMethod = (typeof PLAN_POI_BOOKING_METHODS)[number];

export const PLAN_POI_BOOKING_METHOD_LABELS: Record<PlanPoiBookingMethod, string> = {
  unconfirmed: "미확인",
  naver: "네이버 예약",
  secretmall: "시크릿몰",
  yeogi: "여기어때",
  agoda: "아고다",
  phone: "전화",
  walk_in: "현장",
  other: "기타",
};

export type PlanPoiUpdatePayload = {
  name: string;
  poi_type: PlanPoiType;
  memo: string | null;
  assignment_mode: PlanPoiAssignmentMode;
  stage_id: string | null;
  intent: PlanPoiIntent;
  booking_method: PlanPoiBookingMethod;
  booking_url: string | null;
  booking_checked_at: string | null;
  candidate_sort_order?: number | null;
};

export type PlanPoiCreatePayload = PlanPoiUpdatePayload & {
  kakao_place_id: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  address_name: string | null;
  place_url: string | null;
  naver_place_url: string | null;
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
  assignment_mode: PlanPoiAssignmentMode;
  stage_id: string | null;
  intent: PlanPoiIntent;
  phone: string | null;
  address_name: string | null;
  place_url: string | null;
  naver_place_url: string | null;
  booking_method: PlanPoiBookingMethod;
  booking_url: string | null;
  booking_checked_at: string | null;
  candidate_sort_order: number | null;
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

export function isPlanPoiBookingMethod(v: string): v is PlanPoiBookingMethod {
  return (PLAN_POI_BOOKING_METHODS as readonly string[]).includes(v);
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
