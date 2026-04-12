"use client";

import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@my-ridings/ui";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { Stage } from "../types/plan";
import { getStageColor } from "../types/plan";
import { DotsMenu } from "./DotsMenu";

type StageCardProps = {
	stage: Stage;
	/** 호버 또는 패널 선택 등으로 강조 */
	isHighlighted: boolean;
	onHover: (id: string | null) => void;
	onSelect: (stageId: string) => void;
	onUpdateDistance: (stageId: string, newDistanceKm: number) => void;
	onDelete: (stageId: string) => void;
	onEditStage: (stageId: string) => void;
	maxDistanceKm: number;
	dateLabel?: string;
};

function formatNumber(n: number): string {
	return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

function calcEffectiveDistanceKm(distanceKm: number, elevationGain: number): number {
	return Math.round((distanceKm + (elevationGain / 100) * 1.2) * 10) / 10;
}

export default function StageCard({
	stage,
	isHighlighted,
	onHover,
	onSelect,
	onUpdateDistance,
	onDelete,
	onEditStage,
	maxDistanceKm,
	dateLabel,
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
		if (!Number.isNaN(newDist) && newDist > 0) {
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
			className={`group relative rounded-lg border p-3 transition-all ${
				isHighlighted
					? "cursor-pointer border-opacity-100 shadow-md ring-1"
					: "cursor-pointer border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
			}`}
			style={
				isHighlighted
					? {
							borderColor: color.stroke,
							boxShadow: `0 0 0 1px ${color.stroke}20`,
						}
					: undefined
			}
			onMouseEnter={() => onHover(stage.id)}
			onMouseLeave={() => onHover(null)}
			onClick={() => onSelect(stage.id)}
		>
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div
						className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
						style={{ backgroundColor: color.stroke }}
					>
						{stage.dayNumber}
					</div>
					<div className="flex items-baseline gap-1">
						<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
							스테이지 {stage.dayNumber}
						</span>
						{dateLabel && (
							<span className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</span>
						)}
					</div>
					{stage.isLastStage && (
						<span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
							마지막
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<DotsMenu
						entries={[
							{
								type: "item",
								key: "edit",
								label: "수정",
								icon: <PencilIcon className="h-4 w-4" />,
								onSelect: () => onEditStage(stage.id),
							},
							{ type: "separator", key: "sep" },
							{
								type: "item",
								key: "delete",
								label: "삭제",
								icon: <TrashIcon className="h-4 w-4" />,
								variant: "destructive",
								onSelect: () => onDelete(stage.id),
							},
						]}
					/>
				</div>
			</div>

			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-1">
					{isEditing ? (
						<>
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
								onClick={(e) => e.stopPropagation()}
							/>
							<span className="text-xs text-zinc-400">km</span>
						</>
					) : (
						<button
							type="button"
							className="flex items-center gap-1 rounded px-0 text-left hover:underline"
							onClick={(e) => {
								e.stopPropagation();
								handleStartEdit();
							}}
						>
							<span className="font-medium text-zinc-700 dark:text-zinc-300">
								{formatNumber(stage.distanceKm)} km
							</span>
							<span className="text-xs text-green-600 dark:text-green-400">
								+{formatNumber(stage.elevationGain)}m
							</span>
						</button>
					)}
				</div>
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="inline-flex" onPointerDown={(e) => e.stopPropagation()}>
								<Badge variant="secondary" className="cursor-default px-1.5 text-xs font-normal">
									≈ {formatNumber(calcEffectiveDistanceKm(stage.distanceKm, stage.elevationGain))}{" "}
									km
								</Badge>
							</span>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">환산 거리 (거리 + 상승고도/100 × 1.2km)</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
