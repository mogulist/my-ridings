"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Map as MapIcon,
  MapPin,
} from "lucide-react";
import { Badge, Button, cn } from "@my-ridings/ui";
import { SharePlanDuplicateCta } from "./SharePlanDuplicateCta";

const TAB_BAR_H = 68;

type TabId = "summary" | "map" | "stages";

const STAGE_PLACEHOLDER_COLORS = ["#3B82F6", "#8B5CF6"] as const;

type MobileSharedPlanLayoutProps = {
  token: string;
  routeName: string;
  planName: string;
  createdByLabel: string;
  totalDistanceKm: number;
  totalElevationGainM: number;
  totalDays: number;
  heroImageUrl: string | null;
  heroImageFallbackUrl: string | null;
};

function SummaryTabPlaceholder() {
  return (
    <div className="space-y-3 p-4 pb-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex h-24 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm"
        >
          <span className="text-xs">요약 카드 {i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function MapTabPlaceholder() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex flex-[0_0_57%] items-center justify-center border-b border-border bg-muted/50"
      >
        <div className="text-center">
          <MapPin className="mx-auto mb-2 size-8 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">지도 영역</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            인터랙티브 지도가 여기에 표시됩니다
          </p>
        </div>
      </div>
      <div
        className="flex flex-[0_0_43%] flex-col overflow-hidden bg-card"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-2 pt-3">
          <span className="text-xs text-muted-foreground">고도 프로필</span>
          <span className="text-xs text-muted-foreground/80">
            Day 선택 → 지도 연동
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <BarChart3
              className="mx-auto mb-2 size-8 text-muted-foreground/50"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">고도 프로필 차트</p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              스테이지 칩 선택 → 구간 필터
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StagesTabPlaceholder({ dayCount }: { dayCount: number }) {
  return (
    <div className="space-y-3 p-4 pb-8">
      {Array.from({ length: dayCount }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border border-l-4 bg-card shadow-sm"
          style={{
            borderLeftColor: STAGE_PLACEHOLDER_COLORS[i % 2],
          }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <Badge
                className="text-white"
                style={{
                  backgroundColor: STAGE_PLACEHOLDER_COLORS[i % 2],
                }}
              >
                Day {i + 1}
              </Badge>
              <div className="mt-1 text-sm text-muted-foreground">
                일정 카드 플레이스홀더
              </div>
            </div>
            <ChevronDown className="size-4 text-muted-foreground/50" aria-hidden />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileSharedPlanLayout({
  token,
  routeName,
  planName,
  createdByLabel,
  totalDistanceKm,
  totalElevationGainM,
  totalDays,
  heroImageUrl,
  heroImageFallbackUrl,
}: MobileSharedPlanLayoutProps) {
  const [tab, setTab] = useState<TabId>("summary");
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(640);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setViewportH(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  }, []);

  const parallaxOffset = scrollY * 0.35;
  const fadeDen = viewportH * 0.65 || 1;
  const heroOpacity = Math.max(0, Math.min(1, 1 - scrollY / fadeDen));

  const coverSrc = heroImageUrl ?? heroImageFallbackUrl;
  const isMapTab = tab === "map";

  const handleTabChange = (newTab: TabId) => {
    setTab(newTab);
    if (newTab === "map") {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      });
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollRef.current || !heroRef.current) return;
        scrollRef.current.scrollTo({
          top: heroRef.current.offsetHeight,
          behavior: "smooth",
        });
      });
    });
  };

  const distanceRounded = Math.round(totalDistanceKm);
  const elevK =
    totalElevationGainM >= 1000
      ? `+${(totalElevationGainM / 1000).toFixed(1)}k`
      : `+${Math.round(totalElevationGainM)}`;

  const tabs: { key: TabId; label: string; icon: React.ReactNode }[] = [
    {
      key: "summary",
      label: "요약",
      icon: <BarChart3 className="size-4" aria-hidden />,
    },
    {
      key: "map",
      label: "지도",
      icon: <MapIcon className="size-4" aria-hidden />,
    },
    {
      key: "stages",
      label: "일정",
      icon: <Calendar className="size-4" aria-hidden />,
    },
  ];

  const scrollShellClass = cn(
    "h-dvh w-full min-w-0",
    isMapTab
      ? "flex flex-col overflow-hidden bg-background"
      : "overflow-y-auto bg-muted/40 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  );

  const tabBodyMinHeight = `calc(100dvh - ${TAB_BAR_H}px)`;

  return (
    <div
      ref={scrollRef}
      className={scrollShellClass}
      onScroll={isMapTab ? undefined : handleScroll}
      style={isMapTab ? undefined : { scrollbarWidth: "none" }}
    >
      <div
        ref={heroRef}
        className={cn(
          "relative shrink-0 overflow-hidden transition-[height] duration-200 ease-out",
          isMapTab ? "h-0" : "h-dvh",
        )}
      >
        <div
          className="absolute inset-x-0 -top-16 bottom-0"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          {coverSrc ? (
            <img
              src={coverSrc}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div
              className="size-full bg-linear-to-br from-zinc-800 via-zinc-700 to-zinc-900"
              aria-hidden
            />
          )}
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/15 to-black/85" />

        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-8"
          style={{ opacity: heroOpacity }}
        >
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 hover:text-white"
          >
            Plan My Route
          </Link>
          <SharePlanDuplicateCta token={token} variant="hero" />
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 px-6 pb-10"
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
              Ride Plan
            </p>
            <h1 className="text-balance text-2xl font-bold leading-tight text-white">
              {routeName}
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              {planName} · {createdByLabel}
            </p>
          </motion.div>

          <motion.div
            className="mt-5 grid grid-cols-3 gap-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {[
              { val: distanceRounded.toLocaleString(), unit: "km 거리" },
              { val: elevK, unit: "m 획득" },
              { val: String(totalDays), unit: "일 계획" },
            ].map((item) => (
              <div
                key={item.unit}
                className="rounded-xl border border-white/15 bg-white/10 py-2.5 text-center backdrop-blur-sm"
              >
                <div className="text-lg font-semibold text-white">{item.val}</div>
                <div className="mt-0.5 text-xs text-zinc-400">{item.unit}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="mt-6 flex flex-col items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">
              스크롤
            </span>
            <ChevronDown
              className="size-4 animate-bounce text-white/40"
              aria-hidden
            />
          </motion.div>
        </div>
      </div>

      <div className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 shadow-sm backdrop-blur-sm dark:bg-background/95">
        <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {routeName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {distanceRounded}km · {totalDays}일
            </span>
          </div>
          <SharePlanDuplicateCta token={token} variant="sticky" />
        </div>
        <div className="flex">
          {tabs.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleTabChange(t.key)}
              className={cn(
                "h-auto flex-1 rounded-none border-b-2 py-2.5 text-xs font-medium transition-colors",
                tab === t.key
                  ? "border-orange-500 text-orange-600 dark:text-orange-500"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {!isMapTab ? (
        <div
          className="flex flex-col bg-muted/40"
          style={{ minHeight: tabBodyMinHeight }}
        >
          {tab === "summary" && <SummaryTabPlaceholder />}
          {tab === "stages" && (
            <StagesTabPlaceholder dayCount={Math.max(1, totalDays)} />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <MapTabPlaceholder />
        </div>
      )}
    </div>
  );
}
