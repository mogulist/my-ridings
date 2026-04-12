"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@my-ridings/ui";
import { useGuestRouteStore } from "../hooks/useGuestRouteStore";
import type { PublicPlanSnapshot } from "../types/guestPlan";

type SharePlanDuplicateCtaProps = {
  token: string;
  variant?: "header" | "inline" | "hero" | "sticky";
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
