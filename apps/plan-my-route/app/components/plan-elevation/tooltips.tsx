"use client";

import { cn } from "@my-ridings/ui";
import { getGradientColor } from "@my-ridings/plan-geometry";
import type { ClimbProfile } from "@my-ridings/plan-geometry";
import type { CSSProperties } from "react";
import type { ChartDatum } from "@/lib/enrich-chart-data";
import type { Stage } from "@/app/types/plan";
import type { TrackPoint } from "@my-ridings/plan-geometry";
import {
	computeSegmentGainBetweenKm,
	findNextCPInContext,
	findPrevCPInContext,
} from "./elevation-gain";
import type { CPOnRoute, PreviewStageStats } from "./types";

// ── 드래그 중 툴팁 (원본 vs 새값 vs 증감) ──────────────────────────
export function BoundaryTooltip({
	stage,
	previewStats,
	leftPct,
}: {
	stage: Stage;
	originalEndKm: number;
	previewEndKm: number;
	previewStats: PreviewStageStats | null;
	leftPct: number;
}) {
	const distDelta = previewStats ? previewStats.distanceKm - stage.distanceKm : 0;
	const gainDelta = previewStats ? previewStats.elevationGain - stage.elevationGain : 0;
	const lossDelta = previewStats ? previewStats.elevationLoss - stage.elevationLoss : 0;

	const formatDelta = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
	const formatDeltaKm = (v: number) => (v >= 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`);

	return (
		<div
			className="pointer-events-none absolute z-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
			role="tooltip"
			style={{
				left: `${Math.max(8, Math.min(92, leftPct))}%`,
				top: 4,
				transform: leftPct > 25 ? "translateX(calc(-100% - 32px))" : "translateX(32px)",
			}}
		>
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">{stage.dayNumber}일 경계</p>
			<div className="mt-1.5 space-y-0.5">
				<p className="text-zinc-500 dark:text-zinc-400">
					원본: {stage.distanceKm.toFixed(1)} km · +{stage.elevationGain}m / -{stage.elevationLoss}m
				</p>
				{previewStats && (
					<>
						<p className="text-zinc-800 dark:text-zinc-200">
							새값: {previewStats.distanceKm.toFixed(1)} km · +{previewStats.elevationGain}m / -
							{previewStats.elevationLoss}m
						</p>
						<p className="text-orange-600 dark:text-orange-400 font-medium">
							증감: {formatDeltaKm(distDelta)} km · {formatDelta(gainDelta)}m /{" "}
							{formatDelta(lossDelta)}m
						</p>
					</>
				)}
			</div>
		</div>
	);
}


/** 호버 툴팁(CustomTooltip)과 모바일 일정 선택 km·고도 오버레이에 공통 적용.
 * `backdrop-blur`는 sticky 부모 등과 겹칠 때 샘플링이 깨져 불투명하게 보일 수 있어 제외하고, 알파 배경만으로 비침을 낸다. */
const ELEVATION_CHART_TOOLTIP_PANEL_CLASS =
	"rounded-lg border border-white/15 bg-zinc-950/50 text-zinc-100 shadow-md";

type ScheduleSelectionKmEleTooltipProps = {
	km: number;
	ele: number;
	compactTooltip: boolean;
	style: CSSProperties;
};

export function ScheduleSelectionKmEleTooltip({
	km,
	ele,
	compactTooltip,
	style,
}: ScheduleSelectionKmEleTooltipProps) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute z-20 box-border w-max max-w-[min(280px,calc(100%-12px))] shrink-0",
				ELEVATION_CHART_TOOLTIP_PANEL_CLASS,
				compactTooltip ? "px-2 py-1.5 text-[10px] leading-snug" : "px-3 py-2 text-xs",
			)}
			style={style}
		>
			<div className="font-medium tabular-nums">
				{km.toFixed(1)} km · △ {ele} m
			</div>
		</div>
	);
}

// ── 차트·맵 공용 호버/핀 툴팁 ─────────────────────────────────────
type ElevationHoverTooltipProps = {
	datum: ChartDatum;
	trackPoints: TrackPoint[];
	cpMarkers: CPOnRoute[];
	elevationCalibratedThreshold?: number;
	cpAnchorMinKm: number;
	cpAnchorMaxKm: number;
	anchorFallbackDayNumber: number | null;
	compactTooltip: boolean;
	pinned: boolean;
	placementStyle: CSSProperties;
	onUnpin?: () => void;
	gradientPct?: number | null;
};

export function ElevationHoverTooltip({
	datum,
	trackPoints,
	cpMarkers,
	elevationCalibratedThreshold,
	cpAnchorMinKm,
	cpAnchorMaxKm,
	anchorFallbackDayNumber,
	compactTooltip,
	pinned,
	placementStyle,
	onUnpin,
	gradientPct,
}: ElevationHoverTooltipProps) {
	const km = datum.distanceKm;
	const ele = datum.ele;
	const hasStageStats =
		typeof datum.distanceFromStageStartKm === "number" &&
		typeof datum.elevationGainFromStageStart === "number";
	const prevCp = findPrevCPInContext(cpMarkers, km, cpAnchorMinKm);
	const segFromKm = prevCp?.distanceKm ?? cpAnchorMinKm;
	const segDist = Math.round((km - segFromKm) * 10) / 10;
	const segGain =
		cpMarkers.length > 0 && trackPoints.length > 0
			? computeSegmentGainBetweenKm(trackPoints, segFromKm, km, elevationCalibratedThreshold)
			: 0;
	const cpSegLabel = prevCp
		? "이전 CP부터"
		: anchorFallbackDayNumber != null
			? `${anchorFallbackDayNumber}일 출발부터`
			: "출발부터";
	const nextCp = findNextCPInContext(cpMarkers, km, cpAnchorMaxKm);
	const nextTargetKm = nextCp?.distanceKm ?? (hasStageStats ? cpAnchorMaxKm : null);
	const nextTargetLabel = nextCp
		? "다음 CP까지"
		: hasStageStats && anchorFallbackDayNumber != null
			? `${anchorFallbackDayNumber}일 종료까지`
			: null;
	const remainKm = nextTargetKm != null ? Math.round((nextTargetKm - km) * 10) / 10 : null;
	const remainGain =
		nextTargetKm != null && trackPoints.length > 0
			? computeSegmentGainBetweenKm(trackPoints, km, nextTargetKm, elevationCalibratedThreshold)
			: null;

	const rowGap = compactTooltip ? "gap-3" : "gap-4";
	const rowClass = cn("flex flex-nowrap justify-between whitespace-nowrap", rowGap);
	const valueClass = "shrink-0 tabular-nums";
	const blockY = compactTooltip ? "mt-0.5" : "mt-1";
	const cpTop = compactTooltip ? "pt-0.5" : "pt-1";

	const panelClass = pinned
		? "rounded-lg border border-orange-300 bg-white shadow-lg dark:border-orange-600 dark:bg-zinc-800"
		: ELEVATION_CHART_TOOLTIP_PANEL_CLASS;
	const titleTextClass = pinned ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-100";
	const stageTextClass = pinned ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-300";
	const cpTextClass = pinned ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-400";
	const cpBorderClass = pinned ? "border-zinc-200 dark:border-zinc-600" : "border-white/10";
	const hintTextClass = pinned ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400";

	const body = (
		<>
			<span className={cn(rowClass, "font-semibold", titleTextClass)}>
				<span className="shrink-0">{pinned ? "📌 전체" : "전체"}</span>
				<span className={valueClass}>
					{km.toFixed(1)} km · △ {ele} m
				</span>
			</span>
			{gradientPct != null && (
				<span className={cn(rowClass, blockY)} style={{ color: getGradientColor(gradientPct) }}>
					<span className="shrink-0">경사도</span>
					<span className={valueClass}>
						{gradientPct > 0 ? "+" : ""}
						{gradientPct.toFixed(1)}%
					</span>
				</span>
			)}
			{hasStageStats && (
				<span className={cn(rowClass, stageTextClass, blockY)}>
					<span className="shrink-0">스테이지</span>
					<span className={valueClass}>
						+{Number(datum.distanceFromStageStartKm).toFixed(1)} km · ▲{" "}
						{datum.elevationGainFromStageStart} m
					</span>
				</span>
			)}
			{cpMarkers.length > 0 && (
				<span
					className={cn("flex flex-col space-y-0.5 border-t", cpBorderClass, blockY, cpTop)}
				>
					<span className={cn(rowClass, cpTextClass)}>
						<span className="shrink-0">{cpSegLabel}</span>
						<span className={valueClass}>
							+{segDist.toFixed(1)} km · ▲ {segGain} m
						</span>
					</span>
					{nextTargetLabel != null && remainKm != null && remainGain != null && (
						<span className={cn(rowClass, cpTextClass)}>
							<span className="shrink-0">{nextTargetLabel}</span>
							<span className={valueClass}>
								{remainKm.toFixed(1)} km · ▲ {remainGain} m
							</span>
						</span>
					)}
				</span>
			)}
			{pinned && (
				<span className={cn("block text-center", hintTextClass, blockY)}>클릭하여 해제</span>
			)}
		</>
	);

	const sizeClass = compactTooltip
		? "box-border w-max max-w-[min(280px,calc(100%-12px))] shrink-0 min-w-[168px] px-2 py-1.5 text-[10px] leading-snug"
		: "box-border w-max shrink-0 min-w-[200px] px-3 py-2 text-xs";

	if (pinned) {
		return (
			<button
				type="button"
				aria-label="고정 툴팁 해제"
				className={cn(
					"pointer-events-auto absolute z-20 cursor-pointer text-left font-normal",
					panelClass,
					sizeClass,
				)}
				style={placementStyle}
				onClick={(e) => {
					e.stopPropagation();
					onUnpin?.();
				}}
			>
				{body}
			</button>
		);
	}

	return (
		<div
			className={cn("pointer-events-none absolute z-20", panelClass, sizeClass)}
			style={placementStyle}
		>
			{body}
		</div>
	);
}

// ── 클라임 줌 전용 호버 툴팁 ─────────────────────────────────────────

type ClimbHoverTooltipProps = {
	datum: ChartDatum;
	climbProfile: ClimbProfile;
	trackPoints: TrackPoint[];
	elevationCalibratedThreshold?: number;
	compactTooltip: boolean;
	pinned: boolean;
	placementStyle: CSSProperties;
	onUnpin?: () => void;
	gradientPct?: number | null;
};

export function ClimbHoverTooltip({
	datum,
	climbProfile,
	trackPoints,
	elevationCalibratedThreshold,
	compactTooltip,
	pinned,
	placementStyle,
	onUnpin,
	gradientPct,
}: ClimbHoverTooltipProps) {
	const km = datum.distanceKm;
	const ele = datum.ele;

	const doneKm = Math.max(0, km - climbProfile.startDistanceKm);
	const remainKm = Math.max(0, climbProfile.summitDistanceKm - km);

	const doneGainM =
		trackPoints.length > 0
			? computeSegmentGainBetweenKm(
					trackPoints,
					climbProfile.startDistanceKm,
					km,
					elevationCalibratedThreshold,
				)
			: null;
	const remainGainM =
		trackPoints.length > 0 && remainKm > 0
			? computeSegmentGainBetweenKm(
					trackPoints,
					km,
					climbProfile.summitDistanceKm,
					elevationCalibratedThreshold,
				)
			: null;

	const rowGap = compactTooltip ? "gap-3" : "gap-4";
	const rowClass = cn("flex flex-nowrap justify-between whitespace-nowrap", rowGap);
	const valueClass = "shrink-0 tabular-nums";
	const blockY = compactTooltip ? "mt-0.5" : "mt-1";

	const panelClass = pinned
		? "rounded-lg border border-orange-300 bg-white shadow-lg dark:border-orange-600 dark:bg-zinc-800"
		: ELEVATION_CHART_TOOLTIP_PANEL_CLASS;
	const titleTextClass = pinned ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-100";
	const segTextClass = pinned ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-400";
	const hintTextClass = pinned ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400";

	const body = (
		<>
			{gradientPct != null && (
				<span className={cn(rowClass, "font-semibold", titleTextClass)}>
					<span className="shrink-0">{pinned ? "📌 경사도" : "경사도"}</span>
					<span className={valueClass}>
						{gradientPct > 0 ? "+" : ""}
						{gradientPct.toFixed(1)}%
					</span>
				</span>
			)}
			<span className={cn("flex flex-col space-y-0.5", gradientPct != null ? cn("border-t border-white/10", blockY, compactTooltip ? "pt-0.5" : "pt-1") : "")}>
				<span className={cn(rowClass, segTextClass)}>
					<span className="shrink-0">클라임 시작부터</span>
					<span className={valueClass}>
						+{doneKm.toFixed(1)} km{doneGainM != null ? ` · ▲ ${doneGainM} m` : ""}
					</span>
				</span>
				{remainKm > 0 && (
					<span className={cn(rowClass, segTextClass)}>
						<span className="shrink-0">정상까지</span>
						<span className={valueClass}>
							{remainKm.toFixed(1)} km{remainGainM != null ? ` · ▲ ${remainGainM} m` : ""}
						</span>
					</span>
				)}
			</span>
			{pinned && (
				<span className={cn("block text-center", hintTextClass, blockY)}>클릭하여 해제</span>
			)}
		</>
	);

	const sizeClass = compactTooltip
		? "box-border w-max max-w-[min(280px,calc(100%-12px))] shrink-0 min-w-[168px] px-2 py-1.5 text-[10px] leading-snug"
		: "box-border w-max shrink-0 min-w-[200px] px-3 py-2 text-xs";

	if (pinned) {
		return (
			<button
				type="button"
				aria-label="고정 툴팁 해제"
				className={cn(
					"pointer-events-auto absolute z-20 cursor-pointer text-left font-normal",
					panelClass,
					sizeClass,
				)}
				style={placementStyle}
				onClick={(e) => {
					e.stopPropagation();
					onUnpin?.();
				}}
			>
				{body}
			</button>
		);
	}

	return (
		<div
			className={cn("pointer-events-none absolute z-20", panelClass, sizeClass)}
			style={placementStyle}
		>
			{body}
		</div>
	);
}




