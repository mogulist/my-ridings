"use client";

import { getStageColor } from "../types/plan";
import type { Stage } from "../types/plan";
import { useCallback, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@my-ridings/ui";

type StageCardProps = {
  stage: Stage;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onUpdateDistance: (stageId: string, newDistanceKm: number) => void;
  onDelete: (stageId: string) => void;
  /** 거리 수정 가능한 최대값 (다음 Stage 거리를 초과하지 않기 위해) */
  maxDistanceKm: number;
  /** 스테이지 일차에 해당하는 날짜 라벨 (예: 4.27(일)) */
  dateLabel?: string;
};

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

/** 체감 거리(km): 거리 + (상승고도(m)/100)*1.2 — 100m 상승을 평지 1.2km로 환산 */
function calcEffectiveDistanceKm(
  distanceKm: number,
  elevationGain: number,
): number {
  return Math.round((distanceKm + (elevationGain / 100) * 1.2) * 10) / 10;
}

export default function StageCard({
  stage,
  isActive,
  onHover,
  onUpdateDistance,
  onDelete,
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
      {/* 헤더: 색상 도트 + 일차 + 날짜(텍스트 옆) + 액션 메뉴 */}
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
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {dateLabel}
              </span>
            )}
          </div>
          {stage.isLastStage && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              마지막
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
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
      </div>

      {/* 거리·고도(좌) | 환산 거리 badge(우) */}
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
                autoFocus
              />
              <span className="text-xs text-zinc-400">km</span>
            </>
          ) : (
            <>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {formatNumber(stage.distanceKm)} km
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">
                +{formatNumber(stage.elevationGain)}m
              </span>
            </>
          )}
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge
                  variant="secondary"
                  className="text-xs font-normal px-1.5 cursor-default"
                >
                  ≈{" "}
                  {formatNumber(
                    calcEffectiveDistanceKm(
                      stage.distanceKm,
                      stage.elevationGain,
                    ),
                  )}{" "}
                  km
                </Badge>
              </div>
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
