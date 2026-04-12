"use client";

import { cn } from "@my-ridings/ui";
import {
	Coffee,
	Hotel,
	MapPin,
	Mountain,
	ShoppingCart,
	SquareCheckBig,
	Store,
	Utensils,
} from "lucide-react";
import type { ReactNode } from "react";
import { isPlanPoiType } from "../types/planPoi";
import type { StageScheduleWaypoint } from "../types/stageScheduleWaypoint";

const MARKER_ICON_COMPACT = "mt-0.5 size-3.5 shrink-0 text-muted-foreground";
const MARKER_ICON_COMFORTABLE = "mt-1 size-4 shrink-0 text-muted-foreground";

export function WaypointListMarkerIcon({
	row,
	density = "compact",
}: {
	row: StageScheduleWaypoint;
	density?: "compact" | "comfortable";
}) {
	const iconClass = density === "comfortable" ? MARKER_ICON_COMFORTABLE : MARKER_ICON_COMPACT;
	if (row.markerKind === "cp") {
		return <SquareCheckBig className={iconClass} aria-hidden />;
	}
	if (row.markerKind === "summit") {
		return <Mountain className={iconClass} aria-hidden />;
	}
	const t = row.planPoiType ?? "";
	if (isPlanPoiType(t)) {
		switch (t) {
			case "convenience":
				return <Store className={iconClass} aria-hidden />;
			case "mart":
				return <ShoppingCart className={iconClass} aria-hidden />;
			case "accommodation":
				return <Hotel className={iconClass} aria-hidden />;
			case "cafe":
				return <Coffee className={iconClass} aria-hidden />;
			case "restaurant":
				return <Utensils className={iconClass} aria-hidden />;
			default:
				break;
		}
	}
	return <MapPin className={iconClass} aria-hidden />;
}

export type StageScheduleWaypointListDensity = "compact" | "comfortable";

export type StageScheduleWaypointListProps = {
	rows: StageScheduleWaypoint[];
	className?: string;
	headingClassName?: string;
	showHeading?: boolean;
	/** `comfortable`: 데스크탑 패널용 — 본문 `text-sm`, 행 간격 넓힘 */
	density?: StageScheduleWaypointListDensity;
	onPlanPoiRowClick?: (poiId: string) => void;
	renderRowEnd?: (row: StageScheduleWaypoint) => ReactNode;
};

function StatsLine({ row, className }: { row: StageScheduleWaypoint; className?: string }) {
	return (
		<span
			className={cn("tabular-nums text-muted-foreground", className)}
			title="구간 거리 · 해발 고도 · 일차 시작~지점 누적 상승"
		>
			{row.distanceFromStageStartKm.toFixed(1)}km · {row.elevationM}m{" · "}
			<span className="text-muted-foreground/70">
				+{row.elevationGainFromStageStartM.toLocaleString()}m
			</span>
		</span>
	);
}

function WaypointRowMain({
	row,
	density,
}: {
	row: StageScheduleWaypoint;
	density: StageScheduleWaypointListDensity;
}) {
	const comfortable = density === "comfortable";
	return (
		<>
			<WaypointListMarkerIcon row={row} density={density} />
			<div className="min-w-0 flex-1">
				{comfortable ? (
					<>
						<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<span className="text-sm font-medium text-foreground">{row.name}</span>
							<span className="shrink-0 text-xs text-muted-foreground">{row.categoryLabel}</span>
						</div>
						<StatsLine row={row} className="mt-1 block text-sm" />
						{row.memo?.trim() ? (
							<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{row.memo}</p>
						) : null}
					</>
				) : (
					<>
						<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<span className="font-medium text-foreground">{row.name}</span>
							<StatsLine row={row} className="text-xs" />
							<span className="text-[10px] text-muted-foreground">{row.categoryLabel}</span>
						</div>
						{row.memo?.trim() ? (
							<p className="mt-0.5 text-xs leading-snug text-muted-foreground">{row.memo}</p>
						) : null}
					</>
				)}
			</div>
		</>
	);
}

export function StageScheduleWaypointList({
	rows,
	className,
	headingClassName,
	showHeading = true,
	density = "compact",
	onPlanPoiRowClick,
	renderRowEnd,
}: StageScheduleWaypointListProps) {
	if (rows.length === 0) return null;

	const comfortable = density === "comfortable";
	const rowGap = comfortable ? "gap-3" : "gap-2";
	const listGap = comfortable ? "space-y-4" : "space-y-2";
	const rowText = comfortable ? "text-sm" : "text-xs";
	const buttonHover = comfortable ? "hover:bg-muted/50 py-1" : "hover:bg-muted/50";

	return (
		<div className={cn(comfortable ? "space-y-3" : "space-y-2", className)}>
			{showHeading ? (
				<h4
					className={cn(
						"text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground",
						headingClassName,
					)}
				>
					경유 포인트
				</h4>
			) : null}
			<ul className={listGap}>
				{rows.map((row) => {
					const isClickablePoi =
						row.markerKind === "plan_poi" && row.planPoiId != null && onPlanPoiRowClick != null;
					const end = renderRowEnd?.(row);

					return (
						<li key={row.rowKey} className={cn("flex items-start", rowGap, rowText)}>
							{isClickablePoi ? (
								<button
									type="button"
									className={cn(
										"flex min-w-0 flex-1 items-start rounded-md text-left",
										rowGap,
										buttonHover,
									)}
									onClick={() => {
										const id = row.planPoiId;
										if (id) onPlanPoiRowClick(id);
									}}
								>
									<WaypointRowMain row={row} density={density} />
								</button>
							) : (
								<div className={cn("flex min-w-0 flex-1 items-start", rowGap)}>
									<WaypointRowMain row={row} density={density} />
								</div>
							)}
							{end != null ? (
								<span className={cn("inline-flex shrink-0", comfortable ? "pt-1" : "pt-0.5")}>
									{end}
								</span>
							) : null}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
