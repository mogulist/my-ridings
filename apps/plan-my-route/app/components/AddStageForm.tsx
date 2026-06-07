"use client";

import { useCallback, useState } from "react";

interface AddStageFormProps {
	unplannedDistanceKm: number;
	plannedDistanceKm: number;
	onAddStage: (distanceKm: number) => void;
	onAddLastStage: () => void;
	nextDayNumber: number;
}

export default function AddStageForm({
	unplannedDistanceKm,
	plannedDistanceKm,
	onAddStage,
	onAddLastStage,
	nextDayNumber,
}: AddStageFormProps) {
	const [distance, setDistance] = useState("");
	const [isAbsolute, setIsAbsolute] = useState(false);

	const totalDistanceKm = plannedDistanceKm + unplannedDistanceKm;

	const relativeKm = (() => {
		const val = parseFloat(distance);
		if (isNaN(val)) return null;
		return isAbsolute ? val - plannedDistanceKm : val;
	})();

	const isValid =
		relativeKm !== null && relativeKm > 0 && relativeKm <= unplannedDistanceKm;

	const handleAdd = useCallback(() => {
		if (!isValid || relativeKm === null) return;
		onAddStage(relativeKm);
		setDistance("");
	}, [isValid, relativeKm, onAddStage]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleAdd();
		},
		[handleAdd],
	);

	const handleToggleMode = useCallback(() => {
		setDistance("");
		setIsAbsolute((v) => !v);
	}, []);

	if (unplannedDistanceKm <= 0.1) return null;

	return (
		<div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-600">
			<div className="mb-2 flex items-center justify-between">
				<p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
					스테이지 {nextDayNumber} 추가
				</p>
				<button
					type="button"
					onClick={handleToggleMode}
					className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
				>
					{isAbsolute ? "이번 거리로 입력" : "누적 거리로 입력"}
				</button>
			</div>
			<p className="mb-3 text-[11px] text-zinc-400 dark:text-zinc-500">
				{isAbsolute
					? `현재 누적: ${plannedDistanceKm.toFixed(1)} km / 전체: ${totalDistanceKm.toFixed(1)} km`
					: `남은 거리: ${unplannedDistanceKm.toFixed(1)} km`}
			</p>

			<div className="flex items-center gap-2">
				<input
					type="number"
					value={distance}
					onChange={(e) => setDistance(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={isAbsolute ? `누적 거리 (km)` : "거리 (km)"}
					min={isAbsolute ? plannedDistanceKm + 0.1 : 1}
					max={isAbsolute ? totalDistanceKm : unplannedDistanceKm}
					step={1}
					className="flex-1 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500"
				/>
				<button
					onClick={handleAdd}
					disabled={!isValid}
					className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
				>
					추가
				</button>
			</div>

			{isAbsolute && relativeKm !== null && (
				<p
					className={`mt-1.5 text-[11px] ${isValid ? "text-zinc-400 dark:text-zinc-500" : "text-red-400 dark:text-red-500"}`}
				>
					{isValid
						? `이번 스테이지: ${relativeKm.toFixed(1)} km`
						: relativeKm <= 0
							? "현재 누적 거리보다 커야 합니다"
							: "남은 거리를 초과합니다"}
				</p>
			)}

			<button
				onClick={onAddLastStage}
				className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
			>
				🏁 목적지까지 ({unplannedDistanceKm.toFixed(1)} km)
			</button>
		</div>
	);
}
