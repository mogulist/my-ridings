"use client";

import { useCallback, useState } from "react";

interface AddStageFormProps {
	unplannedDistanceKm: number;
	onAddStage: (distanceKm: number) => void;
	onAddLastStage: () => void;
	nextDayNumber: number;
}

export default function AddStageForm({
	unplannedDistanceKm,
	onAddStage,
	onAddLastStage,
	nextDayNumber,
}: AddStageFormProps) {
	const [distance, setDistance] = useState("");

	const handleAdd = useCallback(() => {
		const km = parseFloat(distance);
		if (isNaN(km) || km <= 0) return;
		if (km > unplannedDistanceKm) return;
		onAddStage(km);
		setDistance("");
	}, [distance, unplannedDistanceKm, onAddStage]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleAdd();
		},
		[handleAdd],
	);

	if (unplannedDistanceKm <= 0.1) return null;

	return (
		<div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-600">
			<p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
				스테이지 {nextDayNumber} 추가
			</p>
			<p className="mb-3 text-[11px] text-zinc-400 dark:text-zinc-500">
				남은 거리: {unplannedDistanceKm.toFixed(1)} km
			</p>

			<div className="flex items-center gap-2">
				<input
					type="number"
					value={distance}
					onChange={(e) => setDistance(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="거리 (km)"
					min={1}
					max={unplannedDistanceKm}
					step={1}
					className="flex-1 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500"
				/>
				<button
					onClick={handleAdd}
					disabled={!distance || parseFloat(distance) <= 0}
					className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
				>
					추가
				</button>
			</div>

			<button
				onClick={onAddLastStage}
				className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
			>
				🏁 목적지까지 ({unplannedDistanceKm.toFixed(1)} km)
			</button>
		</div>
	);
}
