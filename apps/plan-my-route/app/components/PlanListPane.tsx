"use client";

type PlanItem = {
  id: string;
  name: string;
  stages?: unknown[];
};

type RouteSummary = {
  name: string;
  rwgpsUrl: string;
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
};

type PlanListPaneProps = {
  routeSummary?: RouteSummary | null;
  plans: PlanItem[];
  activePlanId: string | null;
  onSelectPlan: (planId: string) => void;
  newPlanName: string;
  setNewPlanName: (value: string) => void;
  onSubmitNewPlan: (e: React.FormEvent) => void;
  isCreatingPlan: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

const DEFAULT_LOCALE = "ko-KR";

function formatDistance(meters: number, locale = DEFAULT_LOCALE) {
  const km = meters / 1000;
  const formatted = km.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatted} km`;
}

function formatInteger(value: number, locale = DEFAULT_LOCALE) {
  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export function PlanListPane({
  routeSummary,
  plans,
  activePlanId,
  onSelectPlan,
  newPlanName,
  setNewPlanName,
  onSubmitNewPlan,
  isCreatingPlan,
  isCollapsed,
  onToggleCollapse,
}: PlanListPaneProps) {
  if (isCollapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-10 w-full items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="플랜 목록 펼치기"
          aria-label="플랜 목록 펼치기"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const locale = typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE;

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 px-2 dark:border-zinc-700">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          플랜
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="플랜 목록 접기"
          aria-label="플랜 목록 접기"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        {routeSummary && (
          <div className="mb-3 space-y-1 border-b border-zinc-200 pb-3 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {routeSummary.name}
            </h2>
            <a
              href={routeSummary.rwgpsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-orange-500 hover:underline"
            >
              RideWithGPS에서 보기 ↗
            </a>
            <div className="flex flex-nowrap justify-between text-xs">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                거리 {formatDistance(routeSummary.distanceKm * 1000, locale)}
              </span>
              <span className="flex shrink-0 gap-2">
                <span className="text-green-600 dark:text-green-400">
                  +{formatInteger(routeSummary.elevationGain, locale)} m
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  -{formatInteger(routeSummary.elevationLoss, locale)} m
                </span>
              </span>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="text-xs text-zinc-500">생성된 플랜이 없습니다.</p>
          ) : (
            plans.map((plan) => {
              const stageCount = plan.stages?.length ?? 0;
              const isActive = activePlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "border-orange-500 bg-orange-50 text-zinc-900 dark:border-orange-600 dark:bg-orange-950/40 dark:text-zinc-100"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                  }`}
                >
                  <div className="font-medium">{plan.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {stageCount > 0 ? `${stageCount}일 계획` : "스테이지 없음"}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <form
          onSubmit={onSubmitNewPlan}
          className="mt-3 flex gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700"
        >
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="새 플랜 이름"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
          <button
            type="submit"
            disabled={isCreatingPlan || !newPlanName.trim()}
            className="rounded bg-zinc-800 px-2 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
