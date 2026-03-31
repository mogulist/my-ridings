"use client";

import { useId } from "react";

export function HeroRouteBackground() {
	const uid = useId().replace(/:/g, "");
	const gradientId = `hero-bg-grad-${uid}`;

	return (
		<>
			<div
				className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
				style={{
					background: [
						"linear-gradient(135deg, rgba(196,181,253,0.25) 0%, rgba(237,233,254,0.15) 40%, transparent 70%)",
						"linear-gradient(315deg, rgba(167,243,208,0.18) 0%, rgba(209,250,229,0.1) 30%, transparent 60%)",
					].join(", "),
				}}
				aria-hidden
			/>

			<svg
				className="pointer-events-none absolute inset-0 h-full w-full"
				viewBox="0 0 1200 600"
				preserveAspectRatio="none"
				style={{ opacity: 0.15 }}
				aria-hidden
			>
				<defs>
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#818CF8" />
						<stop offset="100%" stopColor="#C084FC" />
					</linearGradient>
				</defs>
				<path
					d="M0,380 Q180,160 380,300 T720,240 Q920,180 1200,320"
					fill="none"
					stroke={`url(#${gradientId})`}
					strokeWidth="2.5"
					strokeDasharray="1400"
					strokeDashoffset="1400"
					style={{ animation: "drawRoute 2.8s ease-in-out 0.3s forwards" }}
				/>
				{[
					{ cx: 0, cy: 380, delay: "0.2s" },
					{ cx: 380, cy: 300, delay: "1.0s" },
					{ cx: 720, cy: 240, delay: "1.8s" },
					{ cx: 1200, cy: 320, delay: "2.6s" },
				].map((p) => (
					<circle
						key={`${p.cx}-${p.cy}`}
						cx={p.cx}
						cy={p.cy}
						r="7"
						fill="#818CF8"
						opacity="0"
						style={{ animation: `fadeIn 0.5s ${p.delay} ease-in forwards` }}
					/>
				))}
			</svg>
		</>
	);
}
