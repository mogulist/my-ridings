"use client";

import { useCallback } from "react";
import type {
  GuestPlan,
  GuestRoute,
  GuestWorkspace,
  GuestStage,
  PublicPlanSnapshot,
} from "../types/guestPlan";
import { GUEST_STORAGE_KEY } from "../types/guestPlan";
import { normalizeScheduleMarkerMemos } from "../types/scheduleMarkerMemos";

const createDefaultWorkspace = (): GuestWorkspace => ({ version: 1, routes: [] });

const parseWorkspace = (raw: string | null): GuestWorkspace => {
  if (!raw) return createDefaultWorkspace();
  try {
    const parsed = JSON.parse(raw) as Partial<GuestWorkspace>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.routes))
      return createDefaultWorkspace();
    return {
      version: 1,
      routes: parsed.routes,
    };
  } catch {
    return createDefaultWorkspace();
  }
};

const readWorkspace = (): GuestWorkspace => {
  if (typeof window === "undefined") return createDefaultWorkspace();
  return parseWorkspace(window.localStorage.getItem(GUEST_STORAGE_KEY));
};

const writeWorkspace = (nextWorkspace: GuestWorkspace) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(nextWorkspace));
};

const sortStages = (stages: PublicPlanSnapshot["stages"]): GuestStage[] =>
  [...stages]
    .sort((a, b) => (a.start_distance ?? 0) - (b.start_distance ?? 0))
    .map((stage) => ({
      id: crypto.randomUUID(),
      title: stage.title ?? null,
      start_distance: stage.start_distance ?? 0,
      end_distance: stage.end_distance ?? stage.start_distance ?? 0,
      elevation_gain: Number(stage.elevation_gain) || 0,
      elevation_loss: Number(stage.elevation_loss) || 0,
      memo: stage.memo ?? null,
      start_name: stage.start_name ?? null,
      end_name: stage.end_name ?? null,
    }));

const clonePlanPois = (
  planId: string,
  planPois: PublicPlanSnapshot["plan_pois"],
): PublicPlanSnapshot["plan_pois"] =>
  planPois.map((poi) => ({
    ...poi,
    id: crypto.randomUUID(),
    plan_id: planId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

const buildGuestRouteFromPublicPlan = (publicPlan: PublicPlanSnapshot): GuestRoute => {
  const nowIso = new Date().toISOString();
  const routeId = crypto.randomUUID();
  const planId = crypto.randomUUID();
  const routeName = publicPlan.route.name || "공유 경로";

  const scheduleMarkerMemos = normalizeScheduleMarkerMemos(
    publicPlan.plan.schedule_marker_memos,
  );

  const firstPlan: GuestPlan = {
    id: planId,
    name: `${publicPlan.plan.name} (복제본)`,
    start_date: publicPlan.plan.start_date,
    public_share_token: null,
    shared_at: null,
    sort_order: 0,
    created_at: nowIso,
    updated_at: nowIso,
    stages: sortStages(publicPlan.stages),
    ...(scheduleMarkerMemos != null
      ? { schedule_marker_memos: scheduleMarkerMemos }
      : {}),
  };

  return {
    id: routeId,
    name: routeName,
    rwgps_url: publicPlan.route.rwgps_url,
    total_distance: publicPlan.route.total_distance,
    elevation_gain: publicPlan.route.elevation_gain,
    elevation_loss: publicPlan.route.elevation_loss,
    start_date: publicPlan.plan.start_date,
    created_at: nowIso,
    updated_at: nowIso,
    source_public_share_token: publicPlan.plan.public_share_token,
    plans: [firstPlan],
    plan_pois_by_plan_id: {
      [planId]: clonePlanPois(planId, publicPlan.plan_pois ?? []),
    },
  };
};

export const useGuestRouteStore = () => {
  const listRoutes = useCallback(() => {
    const workspace = readWorkspace();
    return workspace.routes;
  }, []);

  const getRouteById = useCallback((routeId: string) => {
    const workspace = readWorkspace();
    return workspace.routes.find((route) => route.id === routeId) ?? null;
  }, []);

  const createRouteFromPublicPlan = useCallback((publicPlan: PublicPlanSnapshot) => {
    const workspace = readWorkspace();
    const guestRoute = buildGuestRouteFromPublicPlan(publicPlan);
    writeWorkspace({
      ...workspace,
      routes: [guestRoute, ...workspace.routes],
    });
    return guestRoute;
  }, []);

  const upsertRoute = useCallback((nextRoute: GuestRoute) => {
    const workspace = readWorkspace();
    const nextRoutes = workspace.routes.some((route) => route.id === nextRoute.id)
      ? workspace.routes.map((route) => (route.id === nextRoute.id ? nextRoute : route))
      : [nextRoute, ...workspace.routes];
    writeWorkspace({
      ...workspace,
      routes: nextRoutes,
    });
    return nextRoute;
  }, []);

  return {
    listRoutes,
    getRouteById,
    createRouteFromPublicPlan,
    upsertRoute,
  };
};
