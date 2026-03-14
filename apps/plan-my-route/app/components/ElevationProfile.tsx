"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { Stage } from "../types/plan";
import { getStageColor, UNPLANNED_COLOR } from "../types/plan";
import type { PendingStageEdit } from "../hooks/usePlanStages";

// ── 타입 ─────────────────────────────────────────────────────────
export interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도 (m)
	d?: number; // 누적 거리 (m)
}

interface ChartDatum {
	distanceKm: number;
	ele: number;
	index: number;
	/** 이 포인트가 속한 Stage 번호 (없으면 미계획) */
	stageIndex: number | null;
}

type PreviewStageStats = { distanceKm: number; elevationGain: number; elevationLoss: number };

interface ElevationProfileProps {
	trackPoints: TrackPoint[];
	positionIndex?: number | null;
	onPositionChange?: (index: number | null) => void;
	stages?: Stage[];
	activeStageId?: string | null;
	/** 선택된 일차 (1-based). null이면 전체 표시 */
	selectedDayNumber?: number | null;
	/** day: 선택할 일차. null: 선택 해제(전체 구간) */
	onSelectedDayChange?: (day: number | null) => void;
	/** 경계 미리보기 (드래그 중) */
	pendingStageEdit?: PendingStageEdit | null;
	/** 미리보기 구간 고도/거리 (usePlanStages.previewStageStats) */
	previewStageStats?: PreviewStageStats | null;
	/** 경계 드래그 시작 */
	onStartBoundaryDrag?: (stageId: string, originalEndKm: number) => void;
	/** 경계 드래그 이동 */
	onPreviewMove?: (stageId: string, previewEndKm: number) => void;
	/** 미리보기 적용 */
	onCommitPreview?: () => void;
	/** 미리보기 취소 */
	onDiscardPreview?: () => void;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────

function buildChartData(
	points: TrackPoint[],
	stages: Stage[],
	maxSamples = 2000,
): ChartDatum[] {
	const withEle = points.filter((p) => p.e != null && p.d != null);
	if (withEle.length === 0) return [];

	const step = Math.ceil(withEle.length / maxSamples);
	return withEle
		.filter((_, i) => i % step === 0)
		.map((p) => {
			const distanceKm = Math.round((p.d! / 1000) * 100) / 100;
			// 어느 Stage에 속하는지 결정
			let stageIndex: number | null = null;
			for (let i = 0; i < stages.length; i++) {
				if (
					distanceKm >= stages[i].startDistanceKm &&
					distanceKm <= stages[i].endDistanceKm
				) {
					stageIndex = i;
					break;
				}
			}
			return {
				distanceKm,
				ele: Math.round(p.e!),
				index: points.indexOf(p),
				stageIndex,
			};
		});
}

/** 선택 일차 기준 표시 구간: 선택 일차 전체 + 이전/다음 일차 15% */
function computeVisibleRange(
	stages: Stage[],
	selectedDayNumber: number,
	totalKm: number,
): { startKm: number; endKm: number } {
	const stageIdx = stages.findIndex((s) => s.dayNumber === selectedDayNumber);
	if (stageIdx === -1) return { startKm: 0, endKm: totalKm };
	const stage = stages[stageIdx];
	const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null;
	const nextStage =
		stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null;

	const prevPadding = prevStage ? prevStage.distanceKm * 0.15 : 0;
	const nextPadding = nextStage ? nextStage.distanceKm * 0.15 : 0;

	const startKm = prevStage
		? Math.max(0, prevStage.endDistanceKm - prevPadding)
		: stage.startDistanceKm;
	const endKm = nextStage
		? Math.min(totalKm, nextStage.startDistanceKm + nextPadding)
		: stage.endDistanceKm;

	return { startKm, endKm };
}

/** Stage별로 분리된 데이터 키 생성. 각 Stage는 자기 구간만 값을 갖고 나머지는 undefined */
function buildStageKeys(
	chartData: ChartDatum[],
	stages: Stage[],
): { data: Record<string, number | undefined>[]; keys: string[] } {
	const keys: string[] = [];

	// Stage별 키
	for (let i = 0; i < stages.length; i++) {
		keys.push(`stage_${i}`);
	}
	// 미계획 구간 키
	keys.push("unplanned");

	const data = chartData.map((d) => {
		const row: Record<string, number | undefined> = {
			distanceKm: d.distanceKm,
			ele: d.ele,
		};

		for (let i = 0; i < stages.length; i++) {
			row[`stage_${i}`] = d.stageIndex === i ? d.ele : undefined;
		}
		row.unplanned = d.stageIndex === null ? d.ele : undefined;

		return row;
	});

	return { data, keys };
}

// ── 경계 드래그 핸들 ──────────────────────────────────────────────
function BoundaryHandle({
	boundaryKm,
	visibleStart,
	visibleEnd,
	onMouseDown,
}: {
	boundaryKm: number;
	visibleStart: number;
	visibleEnd: number;
	isDragging: boolean;
	onMouseDown: (e: React.MouseEvent) => void;
}) {
	const span = visibleEnd - visibleStart;
	const leftPct =
		span > 0 ? ((boundaryKm - visibleStart) / span) * 100 : 0;
	return (
		<button
			type="button"
			aria-label="경계 이동"
			onMouseDown={onMouseDown}
			className="absolute top-0 left-0 z-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-zinc-400 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-500 dark:bg-zinc-800"
			style={{
				width: 14,
				height: 14,
				left: `${Math.max(0, Math.min(100, leftPct))}%`,
			}}
			tabIndex={-1}
		/>
	);
}

// ── 드래그 중 툴팁 (원본 vs 새값 vs 증감) ──────────────────────────
function BoundaryTooltip({
	stage,
	originalEndKm,
	previewEndKm,
	previewStats,
	leftPct,
}: {
	stage: Stage;
	originalEndKm: number;
	previewEndKm: number;
	previewStats: PreviewStageStats | null;
	leftPct: number;
}) {
	const distDelta = previewStats
		? previewStats.distanceKm - stage.distanceKm
		: 0;
	const gainDelta = previewStats ? previewStats.elevationGain - stage.elevationGain : 0;
	const lossDelta = previewStats ? previewStats.elevationLoss - stage.elevationLoss : 0;

	const formatDelta = (v: number) =>
		v >= 0 ? `+${v}` : `${v}`;
	const formatDeltaKm = (v: number) =>
		v >= 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`;

	return (
		<div
			className="pointer-events-none absolute z-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
			role="tooltip"
			style={{
				left: `${Math.max(8, Math.min(92, leftPct))}%`,
				top: 4,
				transform: leftPct > 70 ? "translateX(-100%)" : "translateX(-50%)",
			}}
		>
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">
				{stage.dayNumber}일 경계
			</p>
			<div className="mt-1.5 space-y-0.5">
				<p className="text-zinc-500 dark:text-zinc-400">
					원본: {stage.distanceKm.toFixed(1)} km · +{stage.elevationGain}m / -{stage.elevationLoss}m
				</p>
				{previewStats && (
					<>
						<p className="text-zinc-800 dark:text-zinc-200">
							새값: {previewStats.distanceKm.toFixed(1)} km · +{previewStats.elevationGain}m / -{previewStats.elevationLoss}m
						</p>
						<p className="text-orange-600 dark:text-orange-400 font-medium">
							증감: {formatDeltaKm(distDelta)} km · {formatDelta(gainDelta)}m / {formatDelta(lossDelta)}m
						</p>
					</>
				)}
			</div>
		</div>
	);
}

// ── 커스텀 툴팁 ───────────────────────────────────────────────────
function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload?: Array<{ payload: any }>;
}) {
	if (!active || !payload?.length) return null;
	const d = payload[0].payload;
	return (
		<div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs dark:border-zinc-700 dark:bg-zinc-800">
			<p className="font-semibold text-zinc-800 dark:text-zinc-100">
				{Number(d.distanceKm).toFixed(1)} km
			</p>
			<p className="text-orange-500">{d.ele} m</p>
		</div>
	);
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function ElevationProfile({
	trackPoints,
	positionIndex = null,
	onPositionChange,
	stages = [],
	activeStageId,
	selectedDayNumber = null,
	onSelectedDayChange,
	pendingStageEdit = null,
	previewStageStats = null,
	onStartBoundaryDrag,
	onPreviewMove,
	onCommitPreview,
	onDiscardPreview,
}: ElevationProfileProps) {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const frozenVisibleRangeRef = useRef<{ startKm: number; endKm: number } | null>(null);

	const rawChartData = useMemo(
		() => buildChartData(trackPoints, stages),
		[trackPoints, stages],
	);

	const hasStages = stages.length > 0;
	const totalKm =
		rawChartData.length > 0
			? rawChartData[rawChartData.length - 1].distanceKm
			: 0;

	const computedVisibleRange = useMemo(() => {
		if (!hasStages || selectedDayNumber == null)
			return { startKm: 0, endKm: totalKm };
		return computeVisibleRange(stages, selectedDayNumber, totalKm);
	}, [hasStages, selectedDayNumber, stages, totalKm]);

	const { startKm: visibleStart, endKm: visibleEnd } = useMemo(() => {
		if (!pendingStageEdit) {
			frozenVisibleRangeRef.current = null;
			return computedVisibleRange;
		}
		if (!frozenVisibleRangeRef.current) {
			frozenVisibleRangeRef.current = {
				startKm: computedVisibleRange.startKm,
				endKm: computedVisibleRange.endKm,
			};
		}
		return frozenVisibleRangeRef.current;
	}, [pendingStageEdit, computedVisibleRange]);

	const clippedChartData = useMemo(() => {
		if (selectedDayNumber == null) return rawChartData;
		return rawChartData.filter(
			(d) => d.distanceKm >= visibleStart && d.distanceKm <= visibleEnd,
		);
	}, [rawChartData, selectedDayNumber, visibleStart, visibleEnd]);

	const { data: multiStageData, keys: stageKeys } = useMemo(
		() => buildStageKeys(clippedChartData, stages),
		[clippedChartData, stages],
	);

	const chartData = hasStages ? multiStageData : clippedChartData;

	const handleMouseMove = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(state: any) => {
			if (!onPositionChange) return;
			const ci: number | null | undefined = state?.activeTooltipIndex;
			if (ci == null || !rawChartData[ci]) {
				onPositionChange(null);
				return;
			}
			onPositionChange(rawChartData[ci].index);
		},
		[rawChartData, onPositionChange],
	);

	const handleMouseLeave = useCallback(() => {
		onPositionChange?.(null);
	}, [onPositionChange]);

	const selectedStage =
		hasStages && selectedDayNumber != null
			? stages.find((s) => s.dayNumber === selectedDayNumber) ?? null
			: null;
	const selectedStageIdx =
		selectedStage != null
			? stages.findIndex((s) => s.id === selectedStage.id)
			: -1;
	const isLastStage =
		selectedStageIdx >= 0 && selectedStageIdx === stages.length - 1;
	const canDragBoundary =
		selectedStage != null &&
		!isLastStage &&
		onStartBoundaryDrag != null &&
		onPreviewMove != null;

	const handleBoundaryDrag = useCallback(
		(clientX: number) => {
			if (!chartContainerRef.current || !selectedStage || !onPreviewMove)
				return;
			const rect = chartContainerRef.current.getBoundingClientRect();
			const span = visibleEnd - visibleStart;
			if (span <= 0) return;
			const km =
				visibleStart +
				((clientX - rect.left) / rect.width) * span;
			onPreviewMove(selectedStage.id, Math.round(km * 10) / 10);
		},
		[selectedStage, visibleStart, visibleEnd, onPreviewMove],
	);

	useEffect(() => {
		if (!isDragging) return;
		const onMove = (e: MouseEvent) => handleBoundaryDrag(e.clientX);
		const onUp = () => setIsDragging(false);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isDragging, handleBoundaryDrag]);

	useEffect(() => {
		if (!pendingStageEdit) setIsDragging(false);
	}, [pendingStageEdit]);

	const currentChartDatum = useMemo(() => {
		if (positionIndex == null || rawChartData.length === 0) return null;
		return rawChartData.reduce<ChartDatum | null>((best, d) => {
			if (!best) return d;
			return Math.abs(d.index - positionIndex) <
				Math.abs(best.index - positionIndex)
				? d
				: best;
		}, null);
	}, [positionIndex, rawChartData]);

	if (rawChartData.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);
	}

	const pendingStage = pendingStageEdit
		? stages.find((s) => s.id === pendingStageEdit.stageId) ?? null
		: null;
	const boundaryKmForHandle = pendingStageEdit
		? pendingStageEdit.previewEndKm
		: selectedStage?.endDistanceKm ?? 0;

	// Stage 경계선: 표시 구간 내의 것만. pending인 경계는 별도 처리 (점선+실선)
	const stageBoundaries = stages
		.map((s) => ({ distanceKm: s.endDistanceKm, stageId: s.id, label: `Stage ${s.dayNumber}` }))
		.filter(
			(b) =>
				b.distanceKm >= visibleStart &&
				b.distanceKm <= visibleEnd &&
				!(pendingStageEdit && b.stageId === pendingStageEdit.stageId),
		);

	return (
		<div className="flex h-full w-full flex-col gap-1 px-2 pt-2">
			{/* 범례 헤더 */}
			<div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
				<div className="flex items-center gap-3 min-w-0">
					<span className="font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
						고도 프로필
					</span>
					<span className="shrink-0">총 {totalKm.toFixed(0)} km</span>
					{hasStages && (
						<div className="flex items-center gap-1">
							{stages.map((s) => {
								const color = getStageColor(s.dayNumber);
								const isSelected = selectedDayNumber === s.dayNumber;
								const isActive = activeStageId === s.id;
								return (
									<button
										key={s.id}
										type="button"
										onClick={() =>
											onSelectedDayChange?.(isSelected ? null : s.dayNumber)
										}
										className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors shrink-0 ${
											isSelected
												? "bg-zinc-200 dark:bg-zinc-600 font-semibold"
												: "hover:bg-zinc-100 dark:hover:bg-zinc-700"
										} ${isActive ? "ring-1 ring-offset-1 ring-zinc-400" : ""}`}
									>
										<span
											className="inline-block h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: color.stroke }}
										/>
										{s.dayNumber}일
									</button>
								);
							})}
						</div>
					)}
				</div>
				{pendingStageEdit != null && (
					<div className="flex items-center gap-1 shrink-0">
						<button
							type="button"
							onClick={onDiscardPreview}
							className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
						>
							취소
						</button>
						<button
							type="button"
							onClick={onCommitPreview}
							className="rounded px-2 py-1 text-xs font-medium bg-orange-500 text-white hover:bg-orange-600"
						>
							적용
						</button>
					</div>
				)}
			</div>

			{/* 차트 */}
			<div
				ref={chartContainerRef}
				className="relative flex-1 min-h-0"
			>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						data={chartData as any}
						margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
					>
						<defs>
							{/* 기본 그라디언트 (Stage 없을 때) */}
							<linearGradient
								id="eleGradient"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor="#f97316"
									stopOpacity={0.4}
								/>
								<stop
									offset="95%"
									stopColor="#f97316"
									stopOpacity={0.05}
								/>
							</linearGradient>
							{/* Stage별 그라디언트 */}
							{stages.map((s, i) => {
								const color = getStageColor(s.dayNumber);
								return (
									<linearGradient
										key={s.id}
										id={`stageGradient_${i}`}
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor={color.stroke}
											stopOpacity={
												activeStageId === s.id
													? 0.6
													: 0.35
											}
										/>
										<stop
											offset="95%"
											stopColor={color.stroke}
											stopOpacity={0.05}
										/>
									</linearGradient>
								);
							})}
							{/* 미계획 그라디언트 */}
							<linearGradient
								id="unplannedGradient"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor={UNPLANNED_COLOR.stroke}
									stopOpacity={0.2}
								/>
								<stop
									offset="95%"
									stopColor={UNPLANNED_COLOR.stroke}
									stopOpacity={0.02}
								/>
							</linearGradient>
						</defs>

						<CartesianGrid
							strokeDasharray="3 3"
							stroke="rgba(0,0,0,0.07)"
						/>

						<XAxis
							dataKey="distanceKm"
							type="number"
							domain={
								selectedDayNumber != null
									? [visibleStart, visibleEnd]
									: ["dataMin", "dataMax"]
							}
							tickFormatter={(v) => `${v} km`}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
						/>

						<YAxis
							dataKey="ele"
							type="number"
							tickFormatter={(v) => `${v}`}
							fontSize={10}
							tick={{ fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							width={38}
							label={{
								value: "m",
								angle: -90,
								position: "insideLeft",
								style: { fill: "#9ca3af", fontSize: 10 },
							}}
						/>

						<Tooltip
							cursor={{
								stroke: "#f97316",
								strokeWidth: 1,
								strokeDasharray: "4 2",
							}}
							content={<CustomTooltip />}
						/>

						{/* Stage가 없는 경우: 기본 Area */}
						{!hasStages && (
							<Area
								type="monotone"
								dataKey="ele"
								stroke="#f97316"
								strokeWidth={1.5}
								fill="url(#eleGradient)"
								isAnimationActive={false}
								activeDot={{
									r: 4,
									fill: "#f97316",
									stroke: "#fff",
									strokeWidth: 2,
								}}
							/>
						)}

						{/* Stage가 있는 경우: Stage별 Area */}
						{hasStages &&
							stageKeys.map((key) => {
								if (key === "unplanned") {
									return (
										<Area
											key={key}
											type="monotone"
											dataKey={key}
											stroke={UNPLANNED_COLOR.stroke}
											strokeWidth={1}
											strokeDasharray="4 2"
											fill="url(#unplannedGradient)"
											isAnimationActive={false}
											connectNulls={false}
											dot={false}
											activeDot={false}
										/>
									);
								}
								const idx = parseInt(key.split("_")[1]);
								const stage = stages[idx];
								if (!stage) return null;
								const color = getStageColor(stage.dayNumber);
								const isActive = activeStageId === stage.id;
								return (
									<Area
										key={key}
										type="monotone"
										dataKey={key}
										stroke={color.stroke}
										strokeWidth={isActive ? 2.5 : 1.5}
										fill={`url(#stageGradient_${idx})`}
										isAnimationActive={false}
										connectNulls={false}
										dot={false}
										activeDot={
											isActive
												? {
														r: 4,
														fill: color.stroke,
														stroke: "#fff",
														strokeWidth: 2,
													}
												: false
										}
									/>
								);
							})}

						{/* Stage 경계선 (pending 제외) */}
						{hasStages &&
							stageBoundaries.map((b, i) => (
								<ReferenceLine
									key={`boundary-${b.stageId}`}
									x={b.distanceKm}
									stroke="#a1a1aa"
									strokeWidth={1}
									strokeDasharray="3 3"
								/>
							))}
						{/* Pending: 원본 점선 + 미리보기 실선 */}
						{pendingStageEdit && pendingStage && (
							<>
								<ReferenceLine
									x={pendingStageEdit.originalEndKm}
									stroke="#a1a1aa"
									strokeWidth={1.5}
									strokeDasharray="4 4"
								/>
								<ReferenceLine
									x={pendingStageEdit.previewEndKm}
									stroke="#3b82f6"
									strokeWidth={2}
								/>
							</>
						)}

						{/* 외부 제어 마커 */}
						{currentChartDatum != null && (
							<>
								<ReferenceLine
									x={currentChartDatum.distanceKm}
									stroke="#f97316"
									strokeWidth={1.5}
									strokeDasharray="4 2"
								/>
								<ReferenceDot
									x={currentChartDatum.distanceKm}
									y={currentChartDatum.ele}
									r={5}
									fill="#f97316"
									stroke="#fff"
									strokeWidth={2}
								/>
							</>
						)}
					</AreaChart>
				</ResponsiveContainer>
				{/* 경계 드래그 핸들 + 미리보기 툴팁 (차트 위 오버레이) */}
				{canDragBoundary && selectedStage && (
					<>
						<BoundaryHandle
							boundaryKm={boundaryKmForHandle}
							visibleStart={visibleStart}
							visibleEnd={visibleEnd}
							isDragging={isDragging}
							onMouseDown={(e) => {
								e.preventDefault();
								onStartBoundaryDrag?.(selectedStage.id, selectedStage.endDistanceKm);
								setIsDragging(true);
							}}
						/>
						{pendingStageEdit && pendingStage && (
							<BoundaryTooltip
								stage={pendingStage}
								originalEndKm={pendingStageEdit.originalEndKm}
								previewEndKm={pendingStageEdit.previewEndKm}
								previewStats={previewStageStats}
								leftPct={
									visibleEnd > visibleStart
										? ((boundaryKmForHandle - visibleStart) / (visibleEnd - visibleStart)) * 100
										: 50
								}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
