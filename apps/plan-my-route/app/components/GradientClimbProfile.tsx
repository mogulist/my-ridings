"use client";

import {
	computeGradeSegments,
	WAHOO_GRADE_COLORS,
	type GradeSegment,
} from "@my-ridings/plan-geometry";
import { cn } from "@my-ridings/ui";
import { useId, useMemo, useState } from "react";
import type { TrackPoint } from "./ElevationProfile";

const CHART_PAD = { top: 8, right: 8, bottom: 20, left: 36 };

type GradientClimbProfileProps = {
	trackPoints: TrackPoint[];
	startDistanceKm: number;
	endDistanceKm: number;
	heightPx?: number;
	className?: string;
	/** 정상 위치 (클라임 기준 km, 상대 거리) */
	summitRelativeKm?: number | null;
};

type HoverInfo = {
	relativeKm: number;
	gradePercent: number;
	elevationM: number;
};

function elevationAt(
	trackPoints: TrackPoint[],
	distanceM: number,
): number | null {
	const valid = trackPoints.filter((p) => p.e != null && p.d != null) as Array<
		TrackPoint & { e: number; d: number }
	>;
	if (valid.length === 0) return null;
	if (distanceM <= valid[0].d) return valid[0].e;
	const last = valid[valid.length - 1];
	if (distanceM >= last.d) return last.e;
	for (let i = 1; i < valid.length; i++) {
		const a = valid[i - 1];
		const b = valid[i];
		if (distanceM >= a.d && distanceM <= b.d) {
			const span = b.d - a.d;
			if (span <= 0) return a.e;
			const t = (distanceM - a.d) / span;
			return a.e + t * (b.e - a.e);
		}
	}
	return null;
}

function segmentAtRelativeKm(
	segments: GradeSegment[],
	startM: number,
	relativeKm: number,
): GradeSegment | null {
	const m = startM + relativeKm * 1000;
	return segments.find((s) => s.startDistanceM <= m && s.endDistanceM > m) ?? null;
}

export function GradientClimbProfile({
	trackPoints,
	startDistanceKm,
	endDistanceKm,
	heightPx = 200,
	className,
	summitRelativeKm = null,
}: GradientClimbProfileProps) {
	const clipId = useId();
	const [hover, setHover] = useState<HoverInfo | null>(null);

	const startM = startDistanceKm * 1000;
	const endM = endDistanceKm * 1000;
	const lengthKm = Math.max(0.001, endDistanceKm - startDistanceKm);

	const segments = useMemo(
		() =>
			computeGradeSegments(trackPoints, {
				startKm: startDistanceKm,
				endKm: endDistanceKm,
			}),
		[trackPoints, startDistanceKm, endDistanceKm],
	);

	const { linePoints, minEle, maxEle } = useMemo(() => {
		const samples: { relKm: number; ele: number }[] = [];
		const stepM = 20;
		for (let m = startM; m <= endM; m += stepM) {
			const ele = elevationAt(trackPoints, m);
			if (ele != null) samples.push({ relKm: (m - startM) / 1000, ele });
		}
		const lastEle = elevationAt(trackPoints, endM);
		if (lastEle != null) {
			const lastRel = lengthKm;
			if (samples.length === 0 || samples[samples.length - 1].relKm < lastRel - 0.001) {
				samples.push({ relKm: lastRel, ele: lastEle });
			}
		}
		if (samples.length === 0) {
			return { linePoints: "", minEle: 0, maxEle: 100 };
		}
		const minEle = Math.min(...samples.map((s) => s.ele));
		const maxEle = Math.max(...samples.map((s) => s.ele));
		return { linePoints: samples, minEle, maxEle };
	}, [trackPoints, startM, endM, lengthKm]);

	const innerW = 400;
	const innerH = heightPx - CHART_PAD.top - CHART_PAD.bottom;
	const eleSpan = Math.max(5, maxEle - minEle);

	const xForKm = (relKm: number) => CHART_PAD.left + (relKm / lengthKm) * innerW;
	const yForEle = (ele: number) =>
		CHART_PAD.top + innerH - ((ele - minEle) / eleSpan) * innerH;

	const handlePointer = (clientX: number, rect: DOMRect) => {
		const svgX = ((clientX - rect.left) / rect.width) * (innerW + CHART_PAD.left + CHART_PAD.right);
		const relKm = Math.max(
			0,
			Math.min(lengthKm, ((svgX - CHART_PAD.left) / innerW) * lengthKm),
		);
		const absM = startM + relKm * 1000;
		const seg = segmentAtRelativeKm(segments, startM, relKm);
		const ele = elevationAt(trackPoints, absM);
		if (ele == null) return;
		setHover({
			relativeKm: relKm,
			gradePercent: seg?.gradePercent ?? 0,
			elevationM: ele,
		});
	};

	const svgW = innerW + CHART_PAD.left + CHART_PAD.right;
	const svgH = heightPx;
	const baselineY = CHART_PAD.top + innerH;

	const polyline =
		typeof linePoints === "string"
			? ""
			: linePoints.map((p) => `${xForKm(p.relKm)},${yForEle(p.ele)}`).join(" ");

	return (
		<div className={cn("relative w-full", className)}>
			<svg
				viewBox={`0 0 ${svgW} ${svgH}`}
				className="w-full touch-none select-none"
				role="img"
				aria-label="경사도 프로필"
				onMouseLeave={() => setHover(null)}
				onMouseMove={(e) => {
					const rect = e.currentTarget.getBoundingClientRect();
					handlePointer(e.clientX, rect);
				}}
				onTouchStart={(e) => {
					const t = e.touches[0];
					if (!t) return;
					const rect = e.currentTarget.getBoundingClientRect();
					handlePointer(t.clientX, rect);
				}}
				onTouchMove={(e) => {
					const t = e.touches[0];
					if (!t) return;
					const rect = e.currentTarget.getBoundingClientRect();
					handlePointer(t.clientX, rect);
				}}
			>
				<defs>
					<clipPath id={clipId}>
						<rect
							x={CHART_PAD.left}
							y={CHART_PAD.top}
							width={innerW}
							height={innerH}
						/>
					</clipPath>
				</defs>

				{/* Y축 눈금 */}
				<text
					x={CHART_PAD.left - 4}
					y={CHART_PAD.top + 4}
					textAnchor="end"
					className="fill-muted-foreground text-[9px]"
				>
					{Math.round(maxEle)}m
				</text>
				<text
					x={CHART_PAD.left - 4}
					y={baselineY}
					textAnchor="end"
					className="fill-muted-foreground text-[9px]"
				>
					{Math.round(minEle)}m
				</text>

				<g clipPath={`url(#${clipId})`}>
					{segments.map((seg) => {
						const relStart = (seg.startDistanceM - startM) / 1000;
						const relEnd = (seg.endDistanceM - startM) / 1000;
						const x = xForKm(relStart);
						const w = Math.max(1, xForKm(relEnd) - x);
						const eleEnd = elevationAt(trackPoints, seg.endDistanceM) ?? minEle;
						const yTop = yForEle(eleEnd);
						const h = baselineY - yTop;
						return (
							<rect
								key={`${seg.startDistanceM}-${seg.endDistanceM}`}
								x={x}
								y={yTop}
								width={w}
								height={h}
								fill={WAHOO_GRADE_COLORS[seg.band]}
								opacity={0.85}
							/>
						);
					})}

					{typeof linePoints !== "string" && linePoints.length > 1 ? (
						<polyline
							points={polyline}
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							className="text-zinc-800 dark:text-zinc-200"
						/>
					) : null}
				</g>

				{summitRelativeKm != null ? (
					<line
						x1={xForKm(summitRelativeKm)}
						x2={xForKm(summitRelativeKm)}
						y1={CHART_PAD.top}
						y2={baselineY}
						stroke="currentColor"
						strokeWidth={1}
						strokeDasharray="3 2"
						className="text-zinc-600 dark:text-zinc-400"
					/>
				) : null}

				{hover ? (
					<>
						<line
							x1={xForKm(hover.relativeKm)}
							x2={xForKm(hover.relativeKm)}
							y1={CHART_PAD.top}
							y2={baselineY}
							stroke="currentColor"
							strokeWidth={1}
							className="text-zinc-500"
						/>
						<circle
							cx={xForKm(hover.relativeKm)}
							cy={yForEle(hover.elevationM)}
							r={3}
							className="fill-zinc-900 dark:fill-zinc-100"
						/>
					</>
				) : null}

				<text
					x={CHART_PAD.left}
					y={svgH - 4}
					className="fill-muted-foreground text-[9px]"
				>
					0 km
				</text>
				<text
					x={CHART_PAD.left + innerW}
					y={svgH - 4}
					textAnchor="end"
					className="fill-muted-foreground text-[9px]"
				>
					{lengthKm.toFixed(1)} km
				</text>
			</svg>

			{hover ? (
				<div className="pointer-events-none absolute right-0 top-0 rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[10px] shadow-sm backdrop-blur-sm">
					<p>
						{hover.relativeKm.toFixed(2)} km · {Math.round(hover.elevationM)} m
					</p>
					<p className="font-medium tabular-nums">{hover.gradePercent.toFixed(1)}%</p>
				</div>
			) : null}
		</div>
	);
}
