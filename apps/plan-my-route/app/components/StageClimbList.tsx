"use client";

import { detectClimbs, WAHOO_GRADE_COLORS, type DetectedClimb } from "@my-ridings/plan-geometry";
import { cn } from "@my-ridings/ui";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { Stage } from "../types/plan";
import type { SummitOnRoute, TrackPoint } from "./ElevationProfile";

type StageClimbListProps = {
	stage: Stage;
	trackPoints: TrackPoint[];
	summitMarkers?: SummitOnRoute[];
	onClimbSelect: (climb: DetectedClimb) => void;
	className?: string;
};

function climbLabel(climb: DetectedClimb, summits: SummitOnRoute[]): string {
	const peakKm = climb.peakDistanceKm;
	const near = summits.find((s) => Math.abs(s.distanceKm - peakKm) < 0.25);
	if (near?.name?.trim()) return near.name.trim();
	return `${climb.lengthKm.toFixed(1)} km 오르막`;
}

function gradeColorForClimb(climb: DetectedClimb): string {
	if (climb.maxGradePercent >= 20) return WAHOO_GRADE_COLORS.extreme;
	if (climb.maxGradePercent >= 12) return WAHOO_GRADE_COLORS.red;
	if (climb.maxGradePercent >= 8) return WAHOO_GRADE_COLORS.orange;
	if (climb.maxGradePercent >= 4) return WAHOO_GRADE_COLORS.yellow;
	return WAHOO_GRADE_COLORS.green;
}

export function StageClimbList({
	stage,
	trackPoints,
	summitMarkers = [],
	onClimbSelect,
	className,
}: StageClimbListProps) {
	const climbs = useMemo(
		() =>
			detectClimbs(trackPoints, {
				startKm: stage.startDistanceKm,
				endKm: stage.endDistanceKm,
			}),
		[trackPoints, stage.startDistanceKm, stage.endDistanceKm],
	);

	if (climbs.length === 0) return null;

	return (
		<div className={cn("space-y-2", className)}>
			<h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
				등반 구간 ({climbs.length})
			</h4>
			<ul className="space-y-1">
				{climbs.map((climb) => (
					<li key={climb.id}>
						<button
							type="button"
							onClick={() => onClimbSelect(climb)}
							className="flex w-full items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2 text-left text-xs hover:bg-muted/60"
						>
							<span
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: gradeColorForClimb(climb) }}
								aria-hidden
							/>
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium text-foreground">
									{climbLabel(climb, summitMarkers)}
								</span>
								<span className="mt-0.5 block tabular-nums text-muted-foreground">
									{climb.lengthKm.toFixed(1)} km · ▲{climb.elevationGainM}m · 평균{" "}
									{climb.avgGradePercent}% · 최대 {climb.maxGradePercent}%
								</span>
							</span>
							<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
