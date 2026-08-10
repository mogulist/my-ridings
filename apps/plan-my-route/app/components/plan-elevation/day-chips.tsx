"use client";

import { Play } from "lucide-react";
import { getStageColor } from "@/app/types/plan";
import type { Stage } from "@/app/types/plan";

type DayStagePillChipsProps = {
	stages: Stage[];
	selectedDayNumber: number | null;
	onSelectedDayChange?: (day: number | null) => void;
};

export function DayStagePillChips({
	stages,
	selectedDayNumber,
	onSelectedDayChange,
}: DayStagePillChipsProps) {
	return (
		<div className="mb-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			<button
				type="button"
				onClick={() => onSelectedDayChange?.(null)}
				className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
					selectedDayNumber == null
						? "bg-orange-500 text-white"
						: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
				}`}
			>
				전체
			</button>
			{stages.map((s) => {
				const color = getStageColor(s.dayNumber);
				const isSel = selectedDayNumber === s.dayNumber;
				return (
					<button
						key={s.id}
						type="button"
						onClick={() => onSelectedDayChange?.(s.dayNumber)}
						className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
							isSel
								? "text-white"
								: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
						}`}
						style={isSel ? { backgroundColor: color.stroke } : undefined}
					>
						{s.dayNumber}일
					</button>
				);
			})}
		</div>
	);
}

type ElevationProfileHeaderProps = {
	totalKm: number;
	stages: Stage[];
	selectedDayNumber: number | null;
	activeStageId?: string | null;
	onSelectedDayChange?: (day: number | null) => void;
	onPlayCourseBriefing?: () => void;
};

export function ElevationProfileHeader({
	totalKm,
	stages,
	selectedDayNumber,
	activeStageId,
	onSelectedDayChange,
	onPlayCourseBriefing,
}: ElevationProfileHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
			<div className="flex min-w-0 items-center gap-3">
				<span className="shrink-0 font-medium text-zinc-700 dark:text-zinc-300">고도 프로필</span>
				<span className="shrink-0">총 {totalKm.toFixed(0)} km</span>
				{stages.length > 0 && (
					<div className="flex items-center gap-1">
						{stages.map((s) => {
							const color = getStageColor(s.dayNumber);
							const isSelected = selectedDayNumber === s.dayNumber;
							const isActive = activeStageId === s.id;
							return (
								<button
									key={s.id}
									type="button"
									onClick={() => onSelectedDayChange?.(isSelected ? null : s.dayNumber)}
									className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
										isSelected
											? "bg-zinc-200 font-semibold dark:bg-zinc-600"
											: "hover:bg-zinc-100 dark:hover:bg-zinc-700"
									} ${isActive ? "ring-1 ring-zinc-400 ring-offset-1" : ""}`}
								>
									<span
										className="inline-block h-2 w-2 shrink-0 rounded-full"
										style={{ backgroundColor: color.stroke }}
									/>
									{s.dayNumber}일
								</button>
							);
						})}
					</div>
				)}
			</div>
			{onPlayCourseBriefing ? (
				<button
					type="button"
					onClick={onPlayCourseBriefing}
					className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
					aria-label="코스 브리핑 재생"
				>
					<Play className="h-3.5 w-3.5 fill-current" />
				</button>
			) : null}
		</div>
	);
}
