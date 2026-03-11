"use client";

import { getStageColor } from "../types/plan";
import type { Stage } from "../types/plan";
import { useCallback, useState } from "react";

interface StageCardProps {
	stage: Stage;
	isActive: boolean;
	onHover: (id: string | null) => void;
	onUpdateDistance: (stageId: string, newDistanceKm: number) => void;
	onDelete: (stageId: string) => void;
	/** 거리 수정 가능한 최대값 (다음 Stage 거리를 초과하지 않기 위해) */
	maxDistanceKm: number;
}

function formatNumber(n: number): string {
	return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

export default function StageCard({
	stage,
	isActive,
	onHover,
	onUpdateDistance,
	onDelete,
	maxDistanceKm,
}: StageCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState("");
	const color = getStageColor(stage.dayNumber);

	const handleStartEdit = useCallback(() => {
		setEditValue(String(stage.distanceKm));
		setIsEditing(true);
	}, [stage.distanceKm]);

	const handleSaveEdit = useCallback(() => {
		const newDist = parseFloat(editValue);
		if (!isNaN(newDist) && newDist > 0) {
			onUpdateDistance(stage.id, newDist);
		}
		setIsEditing(false);
	}, [editValue, stage.id, onUpdateDistance]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleSaveEdit();
			if (e.key === "Escape") setIsEditing(false);
		},
		[handleSaveEdit],
	);

	return (
		<div
			className={`group relative rounded-lg border p-3 transition-all cursor-pointer ${
				isActive
					? "border-opacity-100 shadow-md ring-1"
					: "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
			}`}
			style={
				isActive
					? {
							borderColor: color.stroke,
							boxShadow: `0 0 0 1px ${color.stroke}20`,
						}
					: undefined
			}
			onMouseEnter={() => onHover(stage.id)}
			onMouseLeave={() => onHover(null)}
		>
			{/* 헤더: 색상 도트 + 일차 */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<div
						className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
						style={{ backgroundColor: color.stroke }}
					>
						{stage.dayNumber}
					</div>
					<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
						스테이지 {stage.dayNumber}
					</span>
					{stage.isLastStage && (
						<span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
							마지막
						</span>
					)}
				</div>
			</div>

			{/* 거리 */}
			<div className="flex items-center gap-1 text-sm">
				<span className="text-zinc-400">📏</span>
				{isEditing ? (
					<div className="flex items-center gap-1">
						<input
							type="number"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onKeyDown={handleKeyDown}
							onBlur={handleSaveEdit}
							className="w-20 rounded border border-zinc-300 px-2 py-0.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
							min={1}
							max={maxDistanceKm}
							step={1}
							autoFocus
						/>
						<span className="text-xs text-zinc-400">km</span>
					</div>
				) : (
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						{formatNumber(stage.distanceKm)} km
					</span>
				)}
			</div>

			{/* 고도 정보 */}
			<div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<span className="text-green-600 dark:text-green-400">
					⛰️ +{formatNumber(stage.elevationGain)}m
				</span>
				<span className="text-red-500 dark:text-red-400">
					▼ -{formatNumber(stage.elevationLoss)}m
				</span>
			</div>

			{/* 액션 버튼 */}
			<div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					onClick={(e) => {
						e.stopPropagation();
						handleStartEdit();
					}}
					className="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
				>
					수정
				</button>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onDelete(stage.id);
					}}
					className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
				>
					삭제
				</button>
			</div>
		</div>
	);
}
