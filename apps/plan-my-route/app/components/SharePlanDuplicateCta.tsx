"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Monitor } from "lucide-react";
import { Button } from "@my-ridings/ui";
import { useGuestRouteStore } from "../hooks/useGuestRouteStore";
import type { PublicPlanSnapshot } from "../types/guestPlan";

type SharePlanDuplicateCtaProps = {
  token: string;
  variant?: "header" | "inline" | "hero" | "sticky" | "summary";
};

export const SharePlanDuplicateCta = ({
  token,
  variant = "inline",
}: SharePlanDuplicateCtaProps) => {
  const router = useRouter();
  const { createRouteFromPublicPlan } = useGuestRouteStore();
  const [isPending, setIsPending] = useState(false);

  const handleDuplicate = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      const response = await fetch(`/api/public/plans/${token}`);
      if (!response.ok) throw new Error("공유 플랜을 불러오지 못했습니다.");
      const publicPlan = (await response.json()) as PublicPlanSnapshot;
      const guestRoute = createRouteFromPublicPlan(publicPlan);
      router.push(`/guest/routes/${guestRoute.id}`);
    } catch (error) {
      console.error(error);
      alert("복제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "복제 중..." : "복제 후 수정하기"}
      </button>
    );
  }

  if (variant === "hero") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDuplicate}
        disabled={isPending}
        className="h-auto rounded-full border border-white/25 bg-white/20 px-3 py-2 text-xs text-white backdrop-blur-sm hover:bg-white/30"
      >
        <Copy className="size-3.5! shrink-0" aria-hidden />
        {isPending ? "복제 중..." : "복제하기"}
      </Button>
    );
  }

  if (variant === "sticky") {
    return (
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="inline-flex h-auto items-center gap-1 p-0 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60 dark:text-orange-500 dark:hover:text-orange-400"
      >
        <Copy className="size-3.5 shrink-0" aria-hidden />
        {isPending ? "복제 중..." : "복제"}
      </button>
    );
  }

  if (variant === "summary") {
    return (
      <div className="rounded-xl border border-orange-200/70 bg-linear-to-br from-orange-50/90 to-amber-50/60 p-4 dark:border-orange-900/50 dark:from-orange-950/35 dark:to-amber-950/25">
        <div className="flex items-start gap-3">
          <Monitor
            className="mt-0.5 size-5 shrink-0 text-orange-500 dark:text-orange-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              데스크탑에서 나만의 플랜 만들기
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              이 플랜을 복제하고 내 일정에 맞게 편집해보세요.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              disabled={isPending}
              className="mt-2 h-auto gap-1.5 p-0 text-xs font-medium text-orange-600 hover:bg-transparent hover:text-orange-700 disabled:opacity-60 dark:text-orange-400 dark:hover:text-orange-300"
            >
              <Copy className="size-3.5 shrink-0" aria-hidden />
              {isPending ? "복제 중..." : "플랜 복제하기"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
      <p className="mb-2">
        로그인 없이도 이 플랜을 복제해 직접 수정해볼 수 있어요.
      </p>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="rounded-md bg-orange-500 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "복제 중..." : "내 플랜으로 복제"}
      </button>
    </div>
  );
};
