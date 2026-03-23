"use client";

import { useId } from "react";

const ROUTE_PATH_D = "M50,400 Q200,200 400,350 T800,300 Q950,250 1150,400";

const ROUTE_MARKERS = [
  { x: 50, y: 400, delay: "0s" },
  { x: 400, y: 350, delay: "1s" },
  { x: 800, y: 300, delay: "2s" },
  { x: 1150, y: 400, delay: "2.8s" },
] as const;

export function HeroRouteBackground() {
  const uid = useId().replace(/:/g, "");
  const gradientId = `hero-route-gradient-${uid}`;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-30 dark:opacity-20"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path
        d={ROUTE_PATH_D}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeDasharray="1200"
        strokeDashoffset="1200"
        strokeWidth="3"
        style={{ animation: "drawRoute 3s ease-in-out forwards" }}
      />
      {ROUTE_MARKERS.map((point, i) => (
        <circle
          key={`${point.x}-${point.y}-${i}`}
          cx={point.x}
          cy={point.y}
          fill="#4F46E5"
          opacity="0"
          r="8"
          style={{ animation: `fadeIn 0.5s ${point.delay} ease-in forwards` }}
        />
      ))}
    </svg>
  );
}
