"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type EventHeaderProps = {
  eventTitle: string;
};

const H_DEFAULT = 64;
const H_COLLAPSED = 48;
const LOGO_DEFAULT = 40;
const LOGO_COLLAPSED = 32;

const layoutTransition = { type: "tween" as const, ease: "easeInOut", duration: 0.22 };
const textTransition = { type: "tween" as const, ease: "easeOut", duration: 0.18 };

const textVariants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
};

export function EventHeader({ eventTitle }: EventHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("page-title");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCollapsed(!entry.isIntersecting),
      { rootMargin: `-${H_DEFAULT}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const logoSize = isCollapsed ? LOGO_COLLAPSED : LOGO_DEFAULT;

  return (
    <motion.header
      className="sticky top-0 z-50 h-16 border-b border-border bg-background"
      animate={{ height: isCollapsed ? H_COLLAPSED : H_DEFAULT }}
      transition={layoutTransition}
    >
      <div className="container mx-auto h-full px-4">
        <div className="flex h-full items-center">
          <a href="/" className="group flex items-center gap-2">
            <motion.div
              className="relative h-10 w-10 shrink-0"
              animate={{ width: logoSize, height: logoSize }}
              transition={layoutTransition}
            >
              <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-600"
                />
                <path
                  d="M 20 6 A 14 14 0 0 1 20 34"
                  fill="#10b981"
                  fillOpacity="0.3"
                  className="transition-colors group-hover:fill-emerald-600"
                />
                <circle
                  cx="15"
                  cy="24"
                  r="4"
                  stroke="#059669"
                  strokeWidth="1.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
                <circle
                  cx="25"
                  cy="24"
                  r="4"
                  stroke="#059669"
                  strokeWidth="1.5"
                  fill="none"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
                <path
                  d="M15 24 L20 16 L25 24"
                  stroke="#059669"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-colors group-hover:stroke-emerald-700"
                />
              </svg>
            </motion.div>

            <AnimatePresence mode="wait" initial={false}>
              {isCollapsed ? (
                <motion.span
                  key="event-title"
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={textTransition}
                  className="text-base font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-gray-100"
                >
                  {eventTitle}
                </motion.span>
              ) : (
                <motion.div
                  key="site-title"
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={textTransition}
                  className="flex flex-col"
                >
                  <span className="text-xl font-bold tracking-tight text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-gray-100">
                    K-Fondo
                  </span>
                  <span className="-mt-1 text-xs text-gray-500 dark:text-gray-400">
                    한국 그란폰도 기록 통계
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </a>
        </div>
      </div>
    </motion.header>
  );
}
