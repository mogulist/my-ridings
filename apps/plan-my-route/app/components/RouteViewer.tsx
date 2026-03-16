"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ElevationProfile } from "./ElevationProfile";
import KakaoMap, { type RideWithGPSRoute } from "./KakaoMap";
import { usePlanStages } from "../hooks/usePlanStages";
import { PlanListPane } from "./PlanListPane";
import { PlanStagesPane } from "./PlanStagesPane";
import {
  PendingDeletionDialog,
  DeleteConfirmationDialog,
} from "./DeleteStageDialog";
import type { Stage } from "../types/plan";

interface RouteViewerProps {
  routeId: string;
}

type DbStage = {
  id: string;
  start_distance: number;
  end_distance: number;
  elevation_gain: number | string | null;
  elevation_loss: number | string | null;
};

function normalizeDbStages(rawStages: DbStage[]): Stage[] {
  const sortedStages = [...rawStages].sort(
    (a, b) => a.start_distance - b.start_distance,
  );
  return sortedStages.map((s, index) => ({
    id: s.id,
    dayNumber: index + 1,
    startDistanceKm: s.start_distance / 1000,
    endDistanceKm: s.end_distance / 1000,
    distanceKm: (s.end_distance - s.start_distance) / 1000,
    elevationGain: Number(s.elevation_gain) || 0,
    elevationLoss: Number(s.elevation_loss) || 0,
    isLastStage: false,
  }));
}

export default function RouteViewer({ routeId }: RouteViewerProps) {
  const [route, setRoute] = useState<RideWithGPSRoute | null>(null);
  const [dbRoute, setDbRoute] = useState<any>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [dbStages, setDbStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState("");
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [positionIndex, setPositionIndex] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  );
  const [planListCollapsed, setPlanListCollapsed] = useState(false);
  const [isReorderingPlans, setIsReorderingPlans] = useState(false);
  const [planActionInProgress, setPlanActionInProgress] = useState<
    null | "create" | "update" | "duplicate" | "delete"
  >(null);

  const handlePin = useCallback((index: number) => {
    setPositionIndex(index);
    setIsPinned(true);
  }, []);

  const handleUnpin = useCallback(() => {
    setIsPinned(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Fetch from DB first to get RWGPS URL and nested plans/stages
    fetch(`/api/routes/${routeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load route from DB");
        return res.json();
      })
      .then((dbData) => {
        if (cancelled) return;
        setDbRoute(dbData);

        if (dbData.plans && dbData.plans.length > 0) {
          // Select the first plan by default
          const firstPlan = dbData.plans[0];
          setActivePlanId(firstPlan.id);
          setDbStages(normalizeDbStages(firstPlan.stages || []));
        }

        // Extract RWGPS ID from dbData.rwgps_url
        const match = dbData.rwgps_url.match(/\/routes\/(\d+)/);
        const rwgpsId = match ? match[1] : null;

        if (!rwgpsId) throw new Error("Invalid RWGPS URL in database");

        return fetch(`/api/ridewithgps?routeId=${rwgpsId}`);
      })
      .then((res) => {
        if (!res) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RideWithGPSRoute>;
      })
      .then((data) => {
        if (!cancelled && data) setRoute(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setIsCreatingPlan(true);
    setPlanActionInProgress("create");
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_id: routeId, name: newPlanName }),
      });
      if (!res.ok) throw new Error("Plan creation failed");
      const newPlan = await res.json();

      setDbRoute((prev: any) => ({
        ...prev,
        plans: [...(prev?.plans || []), { ...newPlan, stages: [] }],
      }));
      setActivePlanId(newPlan.id);
      setDbStages([]);
      setNewPlanName("");
    } catch (error) {
      console.error(error);
      alert("플랜 생성에 실패했습니다.");
    } finally {
      setIsCreatingPlan(false);
      setPlanActionInProgress(null);
    }
  };

  const {
    stages,
    activeStageId,
    setActiveStageId,
    totalRouteDistanceKm,
    unplannedDistanceKm,
    calibratedThreshold,

    addStage,
    addLastStage,
    updateStageDistance,

    pendingStageEdit,
    previewStageStats,
    startBoundaryPreview,
    updatePreviewEndKm,
    commitPreview,
    discardPreview,

    pendingDeletion,
    confirmNextStageDeletion,
    cancelPendingDeletion,

    deleteConfirmation,
    requestDeleteStage,
    executeDeleteStage,
    cancelDeleteConfirmation,
  } = usePlanStages(
    route?.track_points ?? [],
    route?.elevation_gain ?? 0,
    dbStages, // Pass initial stages loaded from DB
    activePlanId, // Pass active plan ID to let hook sync updates with API
  );

  // stages 변경 시 selectedDayNumber 유효성 유지. null = 전체 구간 표시
  const effectiveSelectedDay =
    selectedDayNumber === null
      ? null
      : stages.some((s) => s.dayNumber === selectedDayNumber)
        ? selectedDayNumber
        : stages.length > 0
          ? 1
          : null;

  const reviewContext = useMemo(
    () => ({
      routeId,
      planId: activePlanId,
      stageId:
        effectiveSelectedDay != null
          ? stages.find((s) => s.dayNumber === effectiveSelectedDay)?.id ??
            null
          : null,
    }),
    [routeId, activePlanId, effectiveSelectedDay, stages],
  );

  const routeSummary = useMemo(() => {
    if (!route || !dbRoute) return null;
    return {
      name: dbRoute.name || route.name,
      rwgpsUrl:
        dbRoute.rwgps_url ||
        `https://ridewithgps.com/routes/${route.id}`,
      distanceKm: route.distance / 1000,
      elevationGain: route.elevation_gain,
      elevationLoss: route.elevation_loss,
    };
  }, [route, dbRoute]);

  const activePlanName =
    dbRoute?.plans?.find((p: { id: string }) => p.id === activePlanId)
      ?.name ?? null;

  const routeStartDate = dbRoute?.start_date ?? null;

  const activePlanStartDate =
    dbRoute?.plans?.find(
      (p: { id: string; start_date?: string | null }) => p.id === activePlanId,
    )?.start_date ?? null;
  const effectivePlanStartDate = activePlanStartDate ?? routeStartDate;

  const handlePlanSelect = useCallback(
    (planId: string) => {
      setActivePlanId(planId);
      const plan = dbRoute?.plans?.find((p: any) => p.id === planId);
      if (plan) setDbStages(normalizeDbStages(plan.stages || []));
    },
    [dbRoute?.plans],
  );

  const handleUpdatePlan = useCallback(
    async (planId: string, newName: string) => {
      setPlanActionInProgress("update");
      try {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        if (!res.ok) throw new Error("Plan update failed");
        setDbRoute((prev: any) => ({
          ...prev,
          plans: (prev?.plans ?? []).map((p: any) =>
            p.id === planId ? { ...p, name: newName } : p,
          ),
        }));
      } catch (err) {
        console.error(err);
        alert("플랜 이름 수정에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [],
  );

  const handleDeletePlan = useCallback(
    async (planId: string) => {
      setPlanActionInProgress("delete");
      try {
        const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Plan delete failed");
        const prevPlans = dbRoute?.plans ?? [];
        const nextPlans = prevPlans.filter((p: any) => p.id !== planId);
        setDbRoute((prev: any) => ({ ...prev, plans: nextPlans }));
        if (activePlanId === planId) {
          const nextPlan = nextPlans[0];
          if (nextPlan) {
            setActivePlanId(nextPlan.id);
            setDbStages(normalizeDbStages(nextPlan.stages || []));
          } else {
            setActivePlanId(null);
            setDbStages([]);
          }
        }
      } catch (err) {
        console.error(err);
        alert("플랜 삭제에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [dbRoute?.plans, activePlanId],
  );

  const handleDuplicatePlan = useCallback(
    async (plan: { id: string; name: string; stages?: unknown[] }) => {
      setPlanActionInProgress("duplicate");
      try {
        const newName = `Copy of ${plan.name}`;
        const planRes = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route_id: routeId, name: newName }),
        });
        if (!planRes.ok) throw new Error("Plan creation failed");
        const newPlan = await planRes.json();

        const rawStages = (plan.stages ?? []) as {
          start_distance: number;
          end_distance: number;
          elevation_gain?: number | null;
          elevation_loss?: number | null;
          title?: string | null;
        }[];
        const sortedStages = [...rawStages].sort(
          (a, b) => a.start_distance - b.start_distance,
        );
        const createdStages: DbStage[] = [];
        for (const s of sortedStages) {
          const stageRes = await fetch("/api/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan_id: newPlan.id,
              start_distance: s.start_distance,
              end_distance: s.end_distance,
              elevation_gain: s.elevation_gain ?? null,
              elevation_loss: s.elevation_loss ?? null,
              title: s.title ?? null,
            }),
          });
          if (!stageRes.ok) throw new Error("Stage creation failed");
          createdStages.push(await stageRes.json());
        }

        setDbRoute((prev: any) => ({
          ...prev,
          plans: [
            ...(prev?.plans ?? []),
            { ...newPlan, stages: createdStages },
          ],
        }));
        setActivePlanId(newPlan.id);
        setDbStages(normalizeDbStages(createdStages));
      } catch (err) {
        console.error(err);
        alert("플랜 복제에 실패했습니다.");
      } finally {
        setPlanActionInProgress(null);
      }
    },
    [routeId],
  );

  const handleReorderPlans = useCallback(
    async (planIds: string[]) => {
      const prevPlans = dbRoute?.plans ?? [];
      const orderMap = new Map(planIds.map((id, i) => [id, i]));
      const reorderedPlans = [...prevPlans].sort(
        (a: any, b: any) =>
          (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
      setDbRoute((prev: any) => ({ ...prev, plans: reorderedPlans }));
      setIsReorderingPlans(true);
      try {
        const res = await fetch(`/api/routes/${routeId}/plans/order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planIds }),
        });
        if (!res.ok) throw new Error("Plan reorder failed");
      } catch (err) {
        console.error(err);
        setDbRoute((prev: any) => ({ ...prev, plans: prevPlans }));
        alert("플랜 순서 변경에 실패했습니다.");
      } finally {
        setIsReorderingPlans(false);
      }
    },
    [dbRoute?.plans, routeId],
  );

  const handleUpdatePlanStartDateByPlanId = useCallback(
    async (planId: string, startDate: string | null) => {
      try {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_date: startDate }),
        });
        if (!res.ok) throw new Error("Plan start date update failed");
        setDbRoute((prev: any) => ({
          ...prev,
          plans: (prev?.plans ?? []).map((p: any) =>
            p.id === planId ? { ...p, start_date: startDate } : p,
          ),
        }));
      } catch (err) {
        console.error(err);
        alert("시작일 저장에 실패했습니다.");
      }
    },
    [],
  );

  const planActionMessage =
    planActionInProgress === "duplicate"
      ? "플랜 복제 중…"
      : planActionInProgress === "delete"
        ? "플랜 삭제 중…"
        : planActionInProgress === "update"
          ? "이름 수정 중…"
          : planActionInProgress === "create"
            ? "플랜 추가 중…"
            : "";

  return (
    <>
      {planActionInProgress !== null && (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-black/40"
          aria-live="polite"
          aria-busy="true"
        >
          <svg
            className="h-10 w-10 animate-spin text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium text-white drop-shadow-md">
            {planActionMessage}
          </span>
        </div>
      )}

      {/* ── 좌측 2단 사이드바 ── */}
      <aside className="hidden shrink-0 flex-row overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        {loading ? (
          <div className="flex w-80 items-center gap-2 p-4">
            <svg
              className="h-4 w-4 animate-spin text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-zinc-500">경로 불러오는 중…</span>
          </div>
        ) : error ? (
          <div className="w-80 p-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <PlanListPane
              routeSummary={routeSummary ?? undefined}
              plans={dbRoute?.plans ?? []}
              activePlanId={activePlanId}
              isReorderingPlans={isReorderingPlans}
              onSelectPlan={handlePlanSelect}
              onUpdatePlan={handleUpdatePlan}
              onUpdatePlanStartDate={handleUpdatePlanStartDateByPlanId}
              onDuplicatePlan={handleDuplicatePlan}
              onDeletePlan={handleDeletePlan}
              onReorderPlans={handleReorderPlans}
              newPlanName={newPlanName}
              setNewPlanName={setNewPlanName}
              onSubmitNewPlan={handleCreatePlan}
              isCreatingPlan={isCreatingPlan}
              isCollapsed={planListCollapsed}
              onToggleCollapse={() => setPlanListCollapsed((c) => !c)}
            />
            <PlanStagesPane
              planName={activePlanName}
              planId={activePlanId}
              planStartDate={effectivePlanStartDate}
              stages={stages}
              activeStageId={activeStageId}
              setActiveStageId={setActiveStageId}
              totalRouteDistanceKm={totalRouteDistanceKm}
              unplannedDistanceKm={unplannedDistanceKm}
              updateStageDistance={updateStageDistance}
              requestDeleteStage={requestDeleteStage}
              addStage={addStage}
              addLastStage={addLastStage}
            />
          </>
        )}
      </aside>

      {/* ── 오른쪽 컬럼: 지도 + 고도 프로필 ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 지도 */}
        <section className="relative min-h-0 flex-1">
          {loading && (
            <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-zinc-800">
                <svg
                  className="h-5 w-5 animate-spin text-orange-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  경로 불러오는 중…
                </span>
              </div>
            </div>
          )}
          {!loading && (
            <KakaoMap
              route={route}
              stages={stages}
              activeStageId={activeStageId}
              onStageHover={setActiveStageId}
              highlightPosition={
                positionIndex != null && route?.track_points?.[positionIndex]
                  ? [
                      route.track_points[positionIndex].y,
                      route.track_points[positionIndex].x,
                    ]
                  : null
              }
              onPositionChange={setPositionIndex}
              trackPoints={route?.track_points ?? []}
              isPinned={isPinned}
              onPin={handlePin}
              onUnpin={handleUnpin}
              reviewContext={reviewContext}
            />
          )}
        </section>

        {/* 고도 프로필 */}
        <section className="hidden h-40 shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
          <ElevationProfile
            trackPoints={route?.track_points ?? []}
            stages={stages}
            activeStageId={activeStageId}
            positionIndex={positionIndex}
            onPositionChange={setPositionIndex}
            selectedDayNumber={effectiveSelectedDay}
            onSelectedDayChange={(day) => setSelectedDayNumber(day)}
            pendingStageEdit={pendingStageEdit}
            previewStageStats={previewStageStats}
            onStartBoundaryDrag={startBoundaryPreview}
            onPreviewMove={(_, previewEndKm) => updatePreviewEndKm(previewEndKm)}
            onCommitPreview={commitPreview}
            onDiscardPreview={discardPreview}
            isPinned={isPinned}
            onPin={handlePin}
            elevationCalibratedThreshold={calibratedThreshold}
          />
        </section>
      </div>

      {/* ── 다이얼로그 ── */}
      {pendingDeletion && (
        <PendingDeletionDialog
          pending={pendingDeletion}
          onConfirm={() => {
            // 현재 Stage의 거리를 다음 Stage 시작까지로 확장
            const stageIdx = stages.findIndex(
              (s) => s.id === pendingDeletion.stageId,
            );
            if (stageIdx !== -1) {
              const currentStage = stages[stageIdx];
              const nextStage = stages[stageIdx + 1];
              if (nextStage) {
                confirmNextStageDeletion(
                  currentStage.distanceKm + nextStage.distanceKm,
                );
              }
            }
          }}
          onCancel={cancelPendingDeletion}
        />
      )}

      {deleteConfirmation && (
        <DeleteConfirmationDialog
          confirmation={deleteConfirmation}
          onExecute={executeDeleteStage}
          onCancel={cancelDeleteConfirmation}
        />
      )}
    </>
  );
}
