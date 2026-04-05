"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type SharedPlanCardDto = {
  public_share_token: string;
  plan_name: string;
  route_name: string;
  total_distance_m: number | null;
  elevation_gain_m: number | null;
  stage_count: number;
  start_date: string | null;
  author_nickname: string | null;
  shared_at: string | null;
};

type SharedPlansResponse = {
  plans: SharedPlanCardDto[];
};

function formatDistanceKm(totalDistanceM: number | null): string {
  if (totalDistanceM == null || totalDistanceM <= 0) return "—";
  const km = totalDistanceM / 1000;
  const rounded = km >= 100 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}km`;
}

/** 썸네일 오버레이: 천 단위 구분 (예: 1,270km) */
function formatDistanceKmOverlay(totalDistanceM: number | null): string {
  if (totalDistanceM == null || totalDistanceM <= 0) return "—";
  const km = totalDistanceM / 1000;
  if (km >= 100) {
    return `${Math.round(km).toLocaleString("ko-KR")}km`;
  }
  const rounded = Math.round(km * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded.toLocaleString("ko-KR")}km`;
  }
  return `${rounded.toFixed(1)}km`;
}

function formatElevationM(elevationM: number | null): string {
  if (elevationM == null || elevationM <= 0) return "—";
  return `${Math.round(elevationM).toLocaleString("ko-KR")}m`;
}

function formatStartDateLong(iso: string | null): string | null {
  if (!iso) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAuthorByline(nickname: string | null): string | null {
  const t = nickname?.trim();
  if (!t) return null;
  const withoutAt = t.startsWith("@") ? t.slice(1) : t;
  if (!withoutAt) return null;
  return `by @${withoutAt}`;
}

export function HomeLandingSharedPlans() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [plans, setPlans] = useState<SharedPlanCardDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setPlans(null);
    fetch("/api/public/shared-plans")
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<SharedPlansResponse>;
      })
      .then((data) => {
        if (!cancelled) setPlans(data.plans ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          setLoadError("목록을 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  const isLoading = plans === null;
  const isEmpty = !isLoading && plans.length === 0 && !loadError;

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-center text-sm tracking-wide text-indigo-600">
          SHARED PLANS
        </p>
        <h2 className="text-center text-2xl text-slate-900 md:text-3xl">
          공유된 라이딩 계획
        </h2>
        <p className="mt-3 text-center text-sm text-slate-500 md:text-base">
          다른 라이더의 계획을 살펴보세요. 복사해서 나만의 계획을 만들어보세요
        </p>

        {loadError && (
          <p className="mt-8 text-center text-sm text-red-600" role="alert">
            {loadError}
          </p>
        )}

        {isLoading && (
          <p className="mt-10 text-center text-sm text-slate-500">
            불러오는 중…
          </p>
        )}

        {isEmpty && (
          <p className="mt-10 text-center text-sm text-slate-500">
            아직 공개된 계획이 없습니다.
          </p>
        )}

        {!isLoading && plans.length > 0 && (
          <div className="relative mt-10">
            <button
              type="button"
              aria-label="이전 카드로 스크롤"
              onClick={() => scroll("left")}
              className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50 md:flex"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="다음 카드로 스크롤"
              onClick={() => scroll("right")}
              className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50 md:flex"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" aria-hidden />
            </button>

            <div
              ref={scrollRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {plans.map((plan) => {
                const startLong = formatStartDateLong(plan.start_date);
                const dayCount = plan.stage_count;
                const authorLine = formatAuthorByline(plan.author_nickname);
                const overlayElevationText =
                  plan.elevation_gain_m != null && plan.elevation_gain_m > 0
                    ? `↑ ${formatElevationM(plan.elevation_gain_m)}`
                    : formatElevationM(plan.elevation_gain_m);
                return (
                  <Link
                    key={plan.public_share_token}
                    href={`/share/${plan.public_share_token}`}
                    className="flex w-[288px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <div className="relative h-44 shrink-0 overflow-hidden bg-neutral-200">
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 via-black/35 to-transparent px-3 pb-2.5 pt-10"
                        aria-hidden
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-2.5 pt-6 text-sm font-semibold tabular-nums tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                        aria-label={`거리 ${formatDistanceKm(plan.total_distance_m)}, 획득 고도 ${formatElevationM(plan.elevation_gain_m)}`}
                      >
                        <span className="min-w-0 shrink" aria-hidden>
                          {formatDistanceKmOverlay(plan.total_distance_m)}
                        </span>
                        <span className="min-w-0 shrink text-right" aria-hidden>
                          {overlayElevationText}
                        </span>
                      </div>
                    </div>

                    <div className="flex grow flex-col p-4">
                      <p className="text-[11px] font-semibold tracking-wide text-slate-500">
                        경로 이름
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug text-slate-700">
                        {plan.route_name}
                      </h3>

                      <p className="mt-3 text-[11px] font-semibold tracking-wide text-slate-500">
                        계획 이름
                      </p>
                      <p className="mt-1 line-clamp-2 text-lg font-bold leading-snug text-slate-700">
                        {plan.plan_name}
                      </p>

                      {startLong && dayCount > 0 && (
                        <div className="mt-4 flex items-baseline justify-between gap-3 text-sm text-slate-500">
                          <span className="min-w-0 leading-snug">
                            {startLong} 출발
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {dayCount}일간
                          </span>
                        </div>
                      )}
                      {startLong && dayCount <= 0 && (
                        <p className="mt-4 text-sm text-slate-500">
                          {startLong} 출발
                        </p>
                      )}
                      {!startLong && dayCount > 0 && (
                        <p className="mt-4 text-sm text-slate-500">
                          {dayCount}일간
                        </p>
                      )}

                      {authorLine && (
                        <p className="mt-auto pt-2 text-sm font-medium text-slate-500">
                          {authorLine}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
