"use client";

import type { Stage } from "@/app/types/plan";
import { DayStagePillChips } from "./day-chips";

type ElevationProfileEmptyProps = {
	hideChips: boolean;
	alwaysShowChips: boolean;
	hasStages: boolean;
	stages: Stage[];
	selectedDayNumber: number | null;
	onSelectedDayChange?: (day: number | null) => void;
	chartHeightPx?: number;
};

export function ElevationProfileEmpty({
	hideChips,
	alwaysShowChips,
	hasStages,
	stages,
	selectedDayNumber,
	onSelectedDayChange,
	chartHeightPx,
}: ElevationProfileEmptyProps) {
	const chipRow =
		!hideChips && alwaysShowChips && hasStages ? (
			<DayStagePillChips
				stages={stages}
				selectedDayNumber={selectedDayNumber}
				onSelectedDayChange={onSelectedDayChange}
			/>
		) : null;

	const emptyChart = (
		<div
			className="flex w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
			style={{ minHeight: chartHeightPx ?? 88 }}
		>
			<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
		</div>
	);

	if (alwaysShowChips && hasStages) {
		return (
			<div className="flex w-full flex-col gap-1 px-1 pt-1">
				{chipRow}
				{emptyChart}
			</div>
		);
	}

	return (
		<div className="flex h-full items-center justify-center">
			<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
		</div>
	);
}
