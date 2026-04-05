"use client";

import { Map } from "lucide-react";
import { HomeLandingHero } from "./HomeLandingHero";
import { HomeLandingHowToUse } from "./HomeLandingHowToUse";
import { HomeLandingSharedPlans } from "./HomeLandingSharedPlans";
import { PlanMyRouteHeader } from "./PlanMyRouteHeader";

const SIGN_IN_HREF = `/signin?callbackUrl=${encodeURIComponent("/")}`;

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50">
      <PlanMyRouteHeader />
      <HomeLandingHero signInHref={SIGN_IN_HREF} />
      <HomeLandingSharedPlans />
      <HomeLandingHowToUse />

      <footer className="border-t border-gray-100 bg-gray-50 py-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-gray-400 sm:flex-row sm:px-6 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <Map
              className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
              aria-hidden
            />
            <span className="font-semibold text-gray-600 dark:text-zinc-300">
              Plan My Route
            </span>
          </div>
          <p className="text-center sm:text-right">
            멀티데이 라이딩 경로 설계 도구 · 한국 라이더를 위해 만들었습니다
          </p>
        </div>
      </footer>
    </div>
  );
}
