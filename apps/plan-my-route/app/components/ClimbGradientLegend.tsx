"use client";

import {
	WAHOO_GRADE_COLORS,
	WAHOO_GRADE_LABELS_KO,
	type GradeBand,
} from "@my-ridings/plan-geometry";
import { cn } from "@my-ridings/ui";

const LEGEND_BANDS: GradeBand[] = [
	"yellow",
	"orange",
	"red",
	"extreme",
];

type ClimbGradientLegendProps = {
	className?: string;
	/** true면 녹색·하강 포함 */
	showFullScale?: boolean;
};

export function ClimbGradientLegend({
	className,
	showFullScale = false,
}: ClimbGradientLegendProps) {
	const bands: GradeBand[] = showFullScale
		? ["descent", "green", ...LEGEND_BANDS]
		: LEGEND_BANDS;

	return (
		<div className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
			{bands.map((band) => (
				<div key={band} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<span
						className="size-2.5 shrink-0 rounded-sm"
						style={{ backgroundColor: WAHOO_GRADE_COLORS[band] }}
						aria-hidden
					/>
					<span>{WAHOO_GRADE_LABELS_KO[band]}</span>
				</div>
			))}
		</div>
	);
}
