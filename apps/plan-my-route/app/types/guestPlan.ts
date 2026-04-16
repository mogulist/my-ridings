import type { PlanPoiRow } from "./planPoi";
import type { ScheduleMarkerMemos } from "./scheduleMarkerMemos";

export const GUEST_STORAGE_KEY = "pmr:guest:v1";

export type GuestStage = {
  id: string;
  title: string | null;
  start_distance: number;
  end_distance: number;
  elevation_gain: number;
  elevation_loss: number;
  memo: string | null;
  start_name?: string | null;
  end_name?: string | null;
};

export type GuestPlan = {
  id: string;
  name: string;
  start_date: string | null;
  public_share_token: string | null;
  shared_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  stages: GuestStage[];
  /** CP·정상 스케줄 마커 메모 (`rowKey` → 텍스트) */
  schedule_marker_memos?: ScheduleMarkerMemos | null;
};

export type GuestRoute = {
  id: string;
  name: string;
  rwgps_url: string;
  total_distance: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  source_public_share_token: string | null;
  plans: GuestPlan[];
  plan_pois_by_plan_id: Record<string, PlanPoiRow[]>;
};

export type GuestWorkspace = {
  version: 1;
  routes: GuestRoute[];
};

export type PublicPlanSnapshot = {
  plan: {
    id: string;
    name: string;
    start_date: string | null;
    public_share_token: string;
    shared_at: string | null;
    schedule_marker_memos?: ScheduleMarkerMemos | null;
  };
  route: {
    name: string;
    rwgps_url: string;
    total_distance: number | null;
    elevation_gain: number | null;
    elevation_loss: number | null;
  };
  stages: {
    id: string;
    title: string | null;
    start_distance: number | null;
    end_distance: number | null;
    elevation_gain: number | null;
    elevation_loss: number | null;
    memo: string | null;
    start_name?: string | null;
    end_name?: string | null;
  }[];
  plan_pois: PlanPoiRow[];
};
