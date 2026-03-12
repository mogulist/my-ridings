"use client";

import { getStageColor } from "../types/plan";
import type { Stage } from "../types/plan";
import { useCallback, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@my-ridings/ui";

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
			{/* 헤더: 색상 도트 + 일차 + 액션 메뉴 */}
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
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 shrink-0"
							onClick={(e) => e.stopPropagation()}
						>
							<MoreHorizontalIcon className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault();
								handleStartEdit();
							}}
						>
							<PencilIcon className="h-4 w-4" />
							수정
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onSelect={(e) => {
								e.preventDefault();
								onDelete(stage.id);
							}}
						>
							<TrashIcon className="h-4 w-4" />
							삭제
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
		</div>
	);
}
