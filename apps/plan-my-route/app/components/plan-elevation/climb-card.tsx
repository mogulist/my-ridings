"use client";

import { cn, ToggleGroup, ToggleGroupItem } from "@my-ridings/ui";
import { getGradientColor } from "@my-ridings/plan-geometry";
import type { ClimbProfile, ClimbStartMode } from "@my-ridings/plan-geometry";
// ── 클라임 카드 ────────────────────────────────────────────────────

const CLIMB_CATEGORY_STYLE: Record<
	string,
	{ bg: string; text: string }
> = {
	HC: { bg: "bg-red-500", text: "text-white" },
	"1": { bg: "bg-orange-500", text: "text-white" },
	"2": { bg: "bg-amber-500", text: "text-white" },
	"3": { bg: "bg-yellow-400", text: "text-zinc-800" },
	"4": { bg: "bg-zinc-300 dark:bg-zinc-600", text: "text-zinc-700 dark:text-zinc-200" },
};

export function ClimbCard({
	summitName,
	profile,
	onDismiss,
	climbRange,
	onClimbRangeChange,
	visibleModes,
}: {
	summitName: string;
	profile: ClimbProfile;
	onDismiss?: () => void;
	climbRange: ClimbStartMode;
	onClimbRangeChange: (v: ClimbStartMode) => void;
	visibleModes: ClimbStartMode[];
}) {
	const catStyle = profile.category ? CLIMB_CATEGORY_STYLE[profile.category] : null;
	return (
		<div className="flex min-w-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
			{onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
					aria-label="전체 보기"
				>
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
						<path
							d="M9 2L4 7l5 5"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			)}
			<span className="shrink-0 font-medium text-zinc-800 dark:text-zinc-100">{summitName}</span>
			{catStyle && profile.category && (
				<span
					className={cn(
						"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none",
						catStyle.bg,
						catStyle.text,
					)}
				>
					{profile.category === "HC" ? "HC" : `Cat ${profile.category}`}
				</span>
			)}
			{/* 범위 토글: 배지 바로 오른쪽. 선택지가 둘 이상일 때만 노출. */}
			{visibleModes.length > 1 && (
				<ToggleGroup
					type="single"
					value={climbRange}
					onValueChange={(v) => {
						if (v) onClimbRangeChange(v as ClimbStartMode);
					}}
					className="shrink-0 gap-0 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-600"
				>
					{visibleModes.map((v) => (
						<ToggleGroupItem
							key={v}
							value={v}
							size="sm"
							className={cn(
								"h-5 rounded px-2 py-0 text-[10px] font-medium capitalize",
								"text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200",
								"data-[state=on]:bg-zinc-800 data-[state=on]:text-white dark:data-[state=on]:bg-zinc-200 dark:data-[state=on]:text-zinc-900",
							)}
						>
							{v.charAt(0).toUpperCase() + v.slice(1)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
			<div className="ml-auto flex shrink-0 items-center gap-3 text-zinc-500 dark:text-zinc-400">
				<span className="tabular-nums">{profile.lengthKm.toFixed(1)} km</span>
				<span className="tabular-nums">↑{profile.gainM} m</span>
				<span className="tabular-nums">
					avg{" "}
					<span style={{ color: getGradientColor(profile.avgGradientPct) }}>
						{profile.avgGradientPct.toFixed(1)}%
					</span>
				</span>
				<span className="tabular-nums">
					max{" "}
					<span style={{ color: getGradientColor(profile.maxGradientPct) }}>
						{profile.maxGradientPct.toFixed(1)}%
					</span>
				</span>
			</div>
		</div>
	);
}

