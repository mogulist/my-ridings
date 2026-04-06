"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGuestRouteStore } from "../hooks/useGuestRouteStore";
import type { GuestRoute } from "../types/guestPlan";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const HomeLandingGuestRoutes = () => {
  const { listRoutes } = useGuestRouteStore();
  const [guestRoutes, setGuestRoutes] = useState<GuestRoute[]>([]);

  useEffect(() => {
    setGuestRoutes(listRoutes());
  }, [listRoutes]);

  if (guestRoutes.length === 0) return null;

  return (
    <section className="border-y border-zinc-200 bg-zinc-50 px-6 py-10 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          이어서 편집하기 (브라우저 저장)
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          로그인 없이 복제한 라우트를 다시 열어 계속 편집할 수 있습니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {guestRoutes.map((route) => (
            <Link
              key={route.id}
              href={`/guest/routes/${route.id}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {route.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                플랜 {route.plans.length}개 · 최근 수정 {formatDate(route.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
