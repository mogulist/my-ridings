"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	computeGradientSegments,
	detectClimb,
	lookupGradientAtKm,
} from "@my-ridings/plan-geometry";
import type { ClimbProfile, ClimbStartMode } from "@my-ridings/plan-geometry";
import { buildChartData } from "@/lib/enrich-chart-data";
import type { ChartDatum } from "@/lib/enrich-chart-data";
import { summitMarkerKey } from "@/lib/rwgps-plan-markers";
import { buildStageKeys, computeVisibleRange } from "./chart-data-helpers";
import {
	CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM,
	DEFAULT_AREA_CHART_MARGIN,
	ELEVATION_HOVER_TOOLTIP_TOP_BELOW_LABEL_BAND_PX,
	GRADIENT_STRIP_BOTTOM_MARGIN,
	STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX,
	STAGE_END_BOUNDARY_MENU_W_PX,
	chartOverlayXFromRechartsCoordinate,
	elevationChartAnchorXFromKm,
	elevationChartTooltipPlacementFromAnchorX,
	elevationYAxisReservedWidth,
	getChartPlotBox,
	nearestChartRowEleByKm,
	scheduleSelectionTooltipPlotStyle,
} from "./chart-layout";
import { ClimbCard } from "./climb-card";
import { DayStagePillChips, ElevationProfileHeader } from "./day-chips";
import { ElevationAreaChart } from "./elevation-area-chart";
import {
	CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE,
	LABEL_STAGGER_ROW_HEIGHT_PX,
	computeLabelRows,
	resolveLabelStaggerMaxRow,
} from "./marker-labels";
import { StageBoundaryOverlay } from "./stage-boundary-overlay";
import {
	ClimbHoverTooltip,
	ElevationHoverTooltip,
	ScheduleSelectionKmEleTooltip,
} from "./tooltips";
import type { ElevationProfileProps, CPOnRoute, SummitOnRoute } from "./types";

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
	isPinned = false,
	onPin,
	onUnpin,
	elevationCalibratedThreshold,
	cpMarkers = [],
	summitMarkers = [],
	alwaysShowChips = false,
	hideChips = false,
	chartHeightPx,
	compactYAxis = false,
	disablePinAndHoverScrub = false,
	compactTooltip = false,
	singleScheduleMarkerLabel = false,
	scheduleMarkerFocus = null,
	labelLayout = "single",
	onStageEndBoundaryEditMapCenter,
	stageEndBoundaryChartEditMode = false,
	onExitStageEndBoundaryChartEditMode,
}: ElevationProfileProps) {
	const chartInteractionDisabled = disablePinAndHoverScrub || stageEndBoundaryChartEditMode;
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const stageEndBoundaryHitStripRef = useRef<HTMLButtonElement>(null);
	const stageEndBoundaryMenuRef = useRef<HTMLDivElement>(null);
	const [chartBoxWidth, setChartBoxWidth] = useState(0);
	const [isHoveringStageEndBoundary, setIsHoveringStageEndBoundary] = useState(false);
	const [climbZoomSummitKey, setClimbZoomSummitKey] = useState<string | null>(null);
	const [climbRange, setClimbRange] = useState<ClimbStartMode>("full");
	const [stageEndBoundaryMenuAnchor, setStageEndBoundaryMenuAnchor] = useState<{
		leftPx: number;
		topPx: number;
	} | null>(null);
	const frozenVisibleRangeRef = useRef<{ startKm: number; endKm: number } | null>(null);

	useLayoutEffect(() => {
		const root = chartContainerRef.current;
		if (!root) return;
		const measure = () => {
			setChartBoxWidth(root.clientWidth);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		return () => ro.disconnect();
		/** 트랙이 늦게 로드되면 첫 페인트에 차트 루트가 없어 이펙트가 스킵됨 → `chartBoxWidth`가 영구 0. 로드 후 재측정. */
	}, [trackPoints.length]);

	const rawChartData = useMemo(
		() => buildChartData(trackPoints, stages, elevationCalibratedThreshold),
		[trackPoints, stages, elevationCalibratedThreshold],
	);

	const hasStages = stages.length > 0;
	const totalKm = rawChartData.length > 0 ? rawChartData[rawChartData.length - 1].distanceKm : 0;

	const gradientSegments = useMemo(
		() => computeGradientSegments(trackPoints),
		[trackPoints],
	);

	const computedVisibleRange = useMemo(() => {
		if (!hasStages || selectedDayNumber == null) return { startKm: 0, endKm: totalKm };
		return computeVisibleRange(stages, selectedDayNumber, totalKm);
	}, [hasStages, selectedDayNumber, stages, totalKm]);

	// 스케줄 탭에서 서밋 포커스 시 자동 줌, 일반 모드에서는 클릭으로 설정
	const effectiveClimbZoomSummitKey = useMemo(() => {
		if (disablePinAndHoverScrub && scheduleMarkerFocus?.kind === "summit") {
			return summitMarkerKey(scheduleMarkerFocus);
		}
		return climbZoomSummitKey;
	}, [disablePinAndHoverScrub, scheduleMarkerFocus, climbZoomSummitKey]);

	const focusedSummit = useMemo(
		() =>
			summitMarkers.find((s) => summitMarkerKey(s) === effectiveClimbZoomSummitKey) ?? null,
		[effectiveClimbZoomSummitKey, summitMarkers],
	);

	const climbProfilesByMode = useMemo<Record<ClimbStartMode, ClimbProfile | null> | null>(() => {
		if (!focusedSummit) return null;
		return {
			full: detectClimb(focusedSummit.distanceKm, trackPoints, "full"),
			sustained: detectClimb(focusedSummit.distanceKm, trackPoints, "sustained"),
			steep: detectClimb(focusedSummit.distanceKm, trackPoints, "steep"),
		};
	}, [focusedSummit, trackPoints]);

	// 인접 모드가 거의 동일하면 더 긴(=덜 제한적인) 쪽을 토글에서 숨김.
	// 의미 없는 토글 옵션을 줄여서 사용자가 정보가 다른 두 모드만 비교하게 만듦.
	const visibleClimbModes = useMemo<ClimbStartMode[]>(() => {
		if (!climbProfilesByMode) return [];
		const order: ClimbStartMode[] = ["full", "sustained", "steep"];
		let modes = order.filter((m) => climbProfilesByMode[m] != null);
		if (modes.length <= 1) return modes;
		const isNearDup = (a: ClimbProfile, b: ClimbProfile) => {
			const lenDiff = Math.abs(a.lengthKm - b.lengthKm);
			const maxLen = Math.max(a.lengthKm, b.lengthKm);
			const avgDiff = Math.abs(a.avgGradientPct - b.avgGradientPct);
			return (lenDiff < 0.5 || lenDiff / maxLen < 0.05) && avgDiff < 0.3;
		};
		if (
			modes.includes("full") &&
			modes.includes("sustained") &&
			isNearDup(climbProfilesByMode.full!, climbProfilesByMode.sustained!)
		) {
			modes = modes.filter((m) => m !== "full");
		}
		if (
			modes.includes("sustained") &&
			modes.includes("steep") &&
			isNearDup(climbProfilesByMode.sustained!, climbProfilesByMode.steep!)
		) {
			modes = modes.filter((m) => m !== "sustained");
		}
		return modes;
	}, [climbProfilesByMode]);

	// 사용자 선택이 숨겨진 모드면 visible 중 첫 모드(=가장 넓은 컨텍스트)로 폴백.
	const effectiveClimbRange = useMemo<ClimbStartMode>(() => {
		if (visibleClimbModes.length === 0) return climbRange;
		return visibleClimbModes.includes(climbRange) ? climbRange : visibleClimbModes[0];
	}, [climbRange, visibleClimbModes]);

	const climbProfile = useMemo(() => {
		if (!climbProfilesByMode) return null;
		return climbProfilesByMode[effectiveClimbRange] ?? null;
	}, [climbProfilesByMode, effectiveClimbRange]);

	// 경사도 스트립은 클라임 줌이 아닐 때만 X축 0선 아래에 표시
	const showGradientStrip = gradientSegments.length > 0 && climbProfile == null;

	// 클라임 미감지 시에도 서밋 주변 ±2km 줌은 제공
	const summitFocusZoomRange = useMemo(() => {
		if (!focusedSummit || climbProfile != null) return null;
		return {
			startKm: Math.max(0, focusedSummit.distanceKm - 2),
			endKm: Math.min(totalKm, focusedSummit.distanceKm + 1),
		};
	}, [focusedSummit, climbProfile, totalKm]);

	const boundaryKmForVisibleZoom = useMemo(() => {
		if (pendingStageEdit) return pendingStageEdit.previewEndKm;
		if (hasStages && selectedDayNumber != null) {
			const stage = stages.find((s) => s.dayNumber === selectedDayNumber);
			return stage?.endDistanceKm ?? 0;
		}
		return 0;
	}, [pendingStageEdit, hasStages, selectedDayNumber, stages]);

	const _baseRange = useMemo(() => {
		if (!pendingStageEdit) {
			frozenVisibleRangeRef.current = null;
			if (stageEndBoundaryChartEditMode && totalKm > 0) {
				const center = boundaryKmForVisibleZoom;
				return {
					startKm: Math.max(0, center - CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
					endKm: Math.min(totalKm, center + CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
				};
			}
			return computedVisibleRange;
		}
		if (!frozenVisibleRangeRef.current) {
			const base =
				stageEndBoundaryChartEditMode && totalKm > 0
					? {
							startKm: Math.max(0, boundaryKmForVisibleZoom - CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
							endKm: Math.min(totalKm, boundaryKmForVisibleZoom + CHART_STAGE_END_BOUNDARY_EDIT_HALF_WIDTH_KM),
						}
					: computedVisibleRange;
			frozenVisibleRangeRef.current = base;
		}
		return frozenVisibleRangeRef.current;
	}, [
		pendingStageEdit,
		computedVisibleRange,
		stageEndBoundaryChartEditMode,
		boundaryKmForVisibleZoom,
		totalKm,
	]);

	// 클라임 줌 → 해당 구간으로, 서밋 포커스만 있으면 ±2km로 오버라이드
	const visibleStart =
		climbProfile != null
			? Math.max(0, climbProfile.startDistanceKm - 0.1)
			: summitFocusZoomRange != null
				? summitFocusZoomRange.startKm
				: _baseRange.startKm;
	const visibleEnd =
		climbProfile != null
			? Math.min(totalKm, climbProfile.summitDistanceKm + 0.5)
			: summitFocusZoomRange != null
				? summitFocusZoomRange.endKm
				: _baseRange.endKm;

	const clippedChartData = useMemo(() => {
		if (climbProfile != null || summitFocusZoomRange != null) {
			// 클라임 줌: 원본 트랙포인트를 다운샘플링 없이 사용해 호버 해상도 확보
			const filteredPts = trackPoints.filter(
				(p) =>
					p.e != null &&
					p.d != null &&
					(p.d as number) / 1000 >= visibleStart - 0.05 &&
					(p.d as number) / 1000 <= visibleEnd + 0.05,
			);
			return buildChartData(
				filteredPts,
				stages,
				elevationCalibratedThreshold,
				Number.POSITIVE_INFINITY,
			);
		}
		if (selectedDayNumber == null) return rawChartData;
		return rawChartData.filter((d) => d.distanceKm >= visibleStart && d.distanceKm <= visibleEnd);
	}, [
		rawChartData,
		trackPoints,
		stages,
		elevationCalibratedThreshold,
		selectedDayNumber,
		climbProfile,
		summitFocusZoomRange,
		visibleStart,
		visibleEnd,
	]);

	const { data: multiStageData, keys: stageKeys } = useMemo(
		() => buildStageKeys(clippedChartData, stages),
		[clippedChartData, stages],
	);

	const chartData = hasStages ? multiStageData : clippedChartData;

	const scheduleSelectionOverlay = useMemo(() => {
		if (!disablePinAndHoverScrub || !singleScheduleMarkerLabel || !scheduleMarkerFocus) return null;
		let km: number;
		let fallbackEle: number;
		const f = scheduleMarkerFocus;
		if (f.kind === "cp") {
			const cp = cpMarkers.find((c) => c.id === f.id);
			if (!cp) return null;
			km = cp.distanceKm;
			fallbackEle = Math.round(cp.elevation);
		} else if (f.kind === "summit") {
			const s = summitMarkers.find(
				(x) => x.id === f.id && x.passIndex === f.passIndex,
			);
			if (!s) return null;
			km = s.distanceKm;
			fallbackEle = Math.round(s.elevation);
		} else {
			km = f.distanceKm;
			fallbackEle = f.elevationM;
		}
		if (km < visibleStart || km > visibleEnd) return null;
		const best = nearestChartRowEleByKm(
			chartData as Array<{ distanceKm: number; ele?: number | null }>,
			km,
		);
		const ele = best?.ele ?? fallbackEle;
		return { km, ele };
	}, [
		disablePinAndHoverScrub,
		singleScheduleMarkerLabel,
		scheduleMarkerFocus,
		cpMarkers,
		summitMarkers,
		visibleStart,
		visibleEnd,
		chartData,
	]);

	type TooltipState = {
		activeTooltipIndex?: number | string | null;
		activeCoordinate?: { x?: number; y?: number };
	};

	const [scrubAnchorXPx, setScrubAnchorXPx] = useState<number | null>(null);
	const [pinnedAnchorXPx, setPinnedAnchorXPx] = useState<number | null>(null);
	const scrubAnchorXPxRef = useRef<number | null>(null);

	const getChartDataIndexAtTooltip = useCallback(
		(state: TooltipState): number | null => {
			const tooltipIndex = state.activeTooltipIndex;
			if (tooltipIndex == null) return null;
			const normalizedTooltipIndex =
				typeof tooltipIndex === "string" ? Number(tooltipIndex) : tooltipIndex;
			if (!Number.isInteger(normalizedTooltipIndex)) return null;
			const row = chartData[normalizedTooltipIndex] as { index?: number } | undefined;
			return typeof row?.index === "number" ? row.index : null;
		},
		[chartData],
	);

	const lastHoverIndexRef = useRef<number | null>(null);

	const handleMouseMove = useCallback(
		(state: TooltipState) => {
			if (chartInteractionDisabled) return;
			const index = getChartDataIndexAtTooltip(state);
			if (index == null) return;
			lastHoverIndexRef.current = index;
			const coordX = state.activeCoordinate?.x;
			if (typeof coordX === "number" && Number.isFinite(coordX)) {
				const overlayX = chartOverlayXFromRechartsCoordinate(
					coordX,
					chartContainerRef.current,
				);
				scrubAnchorXPxRef.current = overlayX;
				setScrubAnchorXPx(overlayX);
			}
			if (!isPinned && onPositionChange) onPositionChange(index);
		},
		[getChartDataIndexAtTooltip, onPositionChange, isPinned, chartInteractionDisabled],
	);

	const handleMouseLeave = useCallback(() => {
		// 마우스 벗어나도 마커 유지 (null 전달하지 않음)
	}, []);

	const handleChartClick = useCallback(() => {
		if (chartInteractionDisabled) return;
		if (isPinned && onUnpin) {
			setPinnedAnchorXPx(null);
			onUnpin();
			return;
		}
		if (!onPin || lastHoverIndexRef.current == null) return;
		setPinnedAnchorXPx(scrubAnchorXPxRef.current);
		onPin(lastHoverIndexRef.current);
	}, [isPinned, onPin, onUnpin, chartInteractionDisabled]);

	const handleSummitClick = useCallback((key: string) => {
		setClimbZoomSummitKey((prev) => (prev === key ? null : key));
	}, []);

	const selectedStage =
		hasStages && selectedDayNumber != null
			? (stages.find((s) => s.dayNumber === selectedDayNumber) ?? null)
			: null;
	const selectedStageIdx =
		selectedStage != null ? stages.findIndex((s) => s.id === selectedStage.id) : -1;
	const isLastStage = selectedStageIdx >= 0 && selectedStageIdx === stages.length - 1;
	const canDragBoundary =
		selectedStage != null && !isLastStage && onStartBoundaryDrag != null && onPreviewMove != null;

	const handleBoundaryDrag = useCallback(
		(clientX: number) => {
			if (!chartContainerRef.current || !selectedStage || !onPreviewMove) return;
			const rect = chartContainerRef.current.getBoundingClientRect();
			const span = visibleEnd - visibleStart;
			if (span <= 0) return;
			const km = visibleStart + ((clientX - rect.left) / rect.width) * span;
			onPreviewMove(selectedStage.id, Math.round(km * 10) / 10);
		},
		[selectedStage, visibleStart, visibleEnd, onPreviewMove],
	);

	const handleBoundaryDragRef = useRef(handleBoundaryDrag);
	handleBoundaryDragRef.current = handleBoundaryDrag;

	const boundaryDragWindowHandlersRef = useRef<{
		move: (ev: PointerEvent) => void;
		up: (ev: PointerEvent) => void;
	} | null>(null);

	const endBoundaryWindowDrag = useCallback(() => {
		const h = boundaryDragWindowHandlersRef.current;
		if (h) {
			window.removeEventListener("pointermove", h.move);
			window.removeEventListener("pointerup", h.up);
			window.removeEventListener("pointercancel", h.up);
			boundaryDragWindowHandlersRef.current = null;
		}
	}, []);

	const beginBoundaryWindowDrag = useCallback(
		(clientX: number, pointerId: number) => {
			if (boundaryDragWindowHandlersRef.current != null) return;
			const move = (ev: PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				ev.preventDefault();
				handleBoundaryDragRef.current(ev.clientX);
			};
			const up = (ev: PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				endBoundaryWindowDrag();
			};
			boundaryDragWindowHandlersRef.current = { move, up };
			window.addEventListener("pointermove", move, { passive: false });
			window.addEventListener("pointerup", up);
			window.addEventListener("pointercancel", up);
			handleBoundaryDragRef.current(clientX);
		},
		[endBoundaryWindowDrag],
	);

	useEffect(() => {
		return () => {
			endBoundaryWindowDrag();
		};
	}, [endBoundaryWindowDrag]);

	const stageEndBoundaryUiResetKey = `${selectedDayNumber}\0${pendingStageEdit?.stageId ?? ""}\0${pendingStageEdit == null}`;

	useEffect(() => {
		void stageEndBoundaryUiResetKey;
		setIsHoveringStageEndBoundary(false);
		setStageEndBoundaryMenuAnchor(null);
		endBoundaryWindowDrag();
	}, [stageEndBoundaryUiResetKey, endBoundaryWindowDrag]);

	useEffect(() => {
		if (stageEndBoundaryMenuAnchor == null && !stageEndBoundaryChartEditMode) return;
		const onPointerDown = (e: PointerEvent) => {
			if (stageEndBoundaryMenuAnchor == null) return;
			const t = e.target as Node;
			if (stageEndBoundaryMenuRef.current?.contains(t)) return;
			if (stageEndBoundaryHitStripRef.current?.contains(t)) return;
			setStageEndBoundaryMenuAnchor(null);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			if (stageEndBoundaryMenuAnchor != null) {
				setStageEndBoundaryMenuAnchor(null);
				return;
			}
			if (stageEndBoundaryChartEditMode) onExitStageEndBoundaryChartEditMode?.();
		};
		if (stageEndBoundaryMenuAnchor != null) {
			document.addEventListener("pointerdown", onPointerDown);
		}
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [
		stageEndBoundaryMenuAnchor,
		stageEndBoundaryChartEditMode,
		onExitStageEndBoundaryChartEditMode,
	]);

	useEffect(() => {
		if (!pendingStageEdit) endBoundaryWindowDrag();
	}, [pendingStageEdit, endBoundaryWindowDrag]);

	// 스테이지 선택 변경 시 클라임 줌 초기화
	useEffect(() => {
		setClimbZoomSummitKey(null);
	}, [selectedDayNumber]);

	const currentChartDatum = useMemo(() => {
		if (positionIndex == null || clippedChartData.length === 0) return null;
		return clippedChartData.reduce<ChartDatum | null>((best, d) => {
			if (!best) return d;
			return Math.abs(d.index - positionIndex) < Math.abs(best.index - positionIndex) ? d : best;
		}, null);
	}, [positionIndex, clippedChartData]);

	const stageEndBoundaryMenuPosition = useMemo(() => {
		if (stageEndBoundaryMenuAnchor == null) return null;
		const { leftPx } = stageEndBoundaryMenuAnchor;
		if (chartBoxWidth <= 0) return { left: Math.max(0, leftPx), top: "50%" as const };
		const minAnchorX =
			STAGE_END_BOUNDARY_MENU_W_PX + STAGE_END_BOUNDARY_MENU_GAP_FROM_ANCHOR_PX + 8;
		const anchorX = Math.max(minAnchorX, Math.min(leftPx, chartBoxWidth - 8));
		return {
			left: anchorX,
			top: "50%" as const,
		};
	}, [stageEndBoundaryMenuAnchor, chartBoxWidth]);

	const visibleCPs = cpMarkers.filter(
		(cp) => cp.distanceKm >= visibleStart && cp.distanceKm <= visibleEnd,
	);
	const showStageMarkerNames = selectedDayNumber != null || climbProfile != null;
	// 서밋 마커는 항상 렌더링(클릭 가능하도록). 이름은 스테이지 선택/클라임 줌 시에만.
	const visibleSummits = summitMarkers
		.filter((summit) => summit.distanceKm >= visibleStart && summit.distanceKm <= visibleEnd)
		.filter(
			(summit) =>
				!visibleCPs.some(
					(cp) =>
						Math.abs(cp.trackPointIndex - summit.trackPointIndex) <=
						CP_SUMMIT_OVERLAP_TRACK_INDEX_TOLERANCE,
				),
		);

	// 클라임 줌 시 Area fill에 사용할 경사도 그라디언트 stops
	const climbGradientFillStops = useMemo(() => {
		if (!climbProfile || gradientSegments.length === 0) return null;
		const span = visibleEnd - visibleStart;
		if (span <= 0) return null;
		const stops: { offset: number; color: string }[] = [];
		for (const seg of gradientSegments) {
			if (seg.endKm <= visibleStart || seg.startKm >= visibleEnd) continue;
			const startOffset = Math.max(0, (seg.startKm - visibleStart) / span);
			const endOffset = Math.min(1, (seg.endKm - visibleStart) / span);
			if (stops.length === 0 || stops[stops.length - 1].color !== seg.color) {
				stops.push({ offset: startOffset, color: seg.color });
			}
			stops.push({ offset: endOffset, color: seg.color });
		}
		return stops.length > 0 ? stops : null;
	}, [climbProfile, gradientSegments, visibleStart, visibleEnd]);

	// 현재 호버 위치의 경사도
	const hoveredGradientPct = useMemo(() => {
		if (!currentChartDatum) return null;
		return lookupGradientAtKm(gradientSegments, currentChartDatum.distanceKm);
	}, [currentChartDatum, gradientSegments]);
	const useSingleScheduleLabel =
		Boolean(singleScheduleMarkerLabel) && showStageMarkerNames && scheduleMarkerFocus != null;

	/** 선택된 스테이지 구간 내(경계 포함)인지 — 인접 스테이지 오버랩 구간의 라벨은 숨김 */
	const isWithinSelectedStage = (distanceKm: number) => {
		if (selectedStage == null) return true;
		return (
			distanceKm >= selectedStage.startDistanceKm && distanceKm <= selectedStage.endDistanceKm
		);
	};

	const cpNameVisible = (cp: CPOnRoute) => {
		if (!isWithinSelectedStage(cp.distanceKm)) return false;
		if (!useSingleScheduleLabel) return showStageMarkerNames;
		const f = scheduleMarkerFocus;
		return f?.kind === "cp" && f.id === cp.id;
	};

	const summitNameVisible = (summit: SummitOnRoute) => {
		if (!isWithinSelectedStage(summit.distanceKm)) return false;
		if (!useSingleScheduleLabel) return showStageMarkerNames;
		const f = scheduleMarkerFocus;
		return (
			f?.kind === "summit" &&
			f.id === summit.id &&
			f.passIndex === summit.passIndex
		);
	};

	const planPoiFocusInView =
		useSingleScheduleLabel &&
		scheduleMarkerFocus?.kind === "plan_poi" &&
		scheduleMarkerFocus.distanceKm >= visibleStart &&
		scheduleMarkerFocus.distanceKm <= visibleEnd;

	const labelStaggerMaxRow =
		labelLayout === "stagger" ? resolveLabelStaggerMaxRow(chartBoxWidth) : 0;

	/** 라벨 stagger: 조밀할수록 위쪽 row로 배치. 좁은 차트는 최대 3줄, 넓은 차트는 최대 2줄. */
	const { rowByKey: labelRowByKey, maxRowUsed: maxLabelRowUsed } = computeLabelRows({
		enabled: labelLayout === "stagger",
		maxRow: labelStaggerMaxRow,
		visibleStart,
		visibleEnd,
		chartBoxWidth,
		visibleCPs,
		visibleSummits,
		useSingleScheduleLabel,
		scheduleMarkerFocus,
		showStageMarkerNames,
		planPoiFocusInView,
		selectedStageStartKm: selectedStage?.startDistanceKm ?? null,
		selectedStageEndKm: selectedStage?.endDistanceKm ?? null,
	});

	const tooltipCpAnchorKm = selectedStage?.startDistanceKm ?? 0;
	const tooltipCpAnchorMaxKm = selectedStage?.endDistanceKm ?? totalKm;
	const tooltipAnchorDayNumber = selectedStage?.dayNumber ?? null;

	const tightFixedHeightChart =
		typeof chartHeightPx === "number" && chartHeightPx > 0 && compactYAxis;

	/** 고정 높이+컴팩트 축: 일차 선택 시 CP/정상 이름이 위로 잘리지 않도록 플롯 상단 여백 확보 */
	const tightChartMargin = tightFixedHeightChart
		? {
				top:
					showStageMarkerNames &&
					(visibleCPs.length > 0 || visibleSummits.length > 0 || planPoiFocusInView)
						? 16
						: 6,
				right: 4,
				left: 0,
				bottom: 2,
			}
		: null;

	/** 실제로 사용된 stagger row 수만큼만 상단 여백을 동적으로 확보해, POI 적은 스테이지에 빈 공간 방지 */
	const baseChartMargin = tightChartMargin ?? DEFAULT_AREA_CHART_MARGIN;
	const staggerTopExtraPx =
		maxLabelRowUsed > 0 ? maxLabelRowUsed * LABEL_STAGGER_ROW_HEIGHT_PX + 4 : 0;
	let effectiveChartMargin =
		staggerTopExtraPx > 0
			? { ...baseChartMargin, top: Math.max(baseChartMargin.top, 14 + staggerTopExtraPx) }
			: baseChartMargin;
	if (showGradientStrip) {
		effectiveChartMargin = {
			...effectiveChartMargin,
			bottom: Math.max(effectiveChartMargin.bottom, GRADIENT_STRIP_BOTTOM_MARGIN),
		};
	}

	const marginForScheduleTooltip = effectiveChartMargin;
	const yAxisWidthForScheduleTooltip = elevationYAxisReservedWidth(
		tightFixedHeightChart,
		compactYAxis,
	);
	const scheduleTooltipStyle =
		scheduleSelectionOverlay != null && chartBoxWidth > 0
			? scheduleSelectionTooltipPlotStyle({
					km: scheduleSelectionOverlay.km,
					visibleStart,
					visibleEnd,
					chartBoxWidth,
					margin: marginForScheduleTooltip,
					yAxisWidth: yAxisWidthForScheduleTooltip,
				})
			: null;

	const hoverTooltipPlacementStyle = useMemo((): CSSProperties | null => {
		if (currentChartDatum == null || chartBoxWidth <= 0) return null;
		const { plotLeft, plotW } = getChartPlotBox(
			chartBoxWidth,
			marginForScheduleTooltip,
			yAxisWidthForScheduleTooltip,
		);
		const kmAnchorParams = {
			km: currentChartDatum.distanceKm,
			visibleStart,
			visibleEnd,
			chartBoxWidth,
			margin: marginForScheduleTooltip,
			yAxisWidth: yAxisWidthForScheduleTooltip,
		};
		const useRechartsScrubAnchor =
			!isPinned &&
			scrubAnchorXPx != null &&
			positionIndex != null &&
			lastHoverIndexRef.current === positionIndex;
		const anchorX =
			isPinned && pinnedAnchorXPx != null
				? pinnedAnchorXPx
				: useRechartsScrubAnchor
					? scrubAnchorXPx
					: elevationChartAnchorXFromKm(kmAnchorParams);
		const { left, translateX } = elevationChartTooltipPlacementFromAnchorX(
			anchorX,
			plotLeft,
			plotW,
		);
		const hoverTooltipTopPx = showStageMarkerNames
			? marginForScheduleTooltip.top + ELEVATION_HOVER_TOOLTIP_TOP_BELOW_LABEL_BAND_PX
			: 4;
		return { left, top: hoverTooltipTopPx, transform: translateX };
	}, [
		currentChartDatum,
		chartBoxWidth,
		visibleStart,
		visibleEnd,
		marginForScheduleTooltip,
		yAxisWidthForScheduleTooltip,
		scrubAnchorXPx,
		pinnedAnchorXPx,
		isPinned,
		positionIndex,
		showStageMarkerNames,
	]);

	if (rawChartData.length === 0) {
		const chipRow =
			!hideChips && alwaysShowChips && hasStages ? (
				<DayStagePillChips stages={stages} selectedDayNumber={selectedDayNumber} onSelectedDayChange={onSelectedDayChange} />
			) : null;

		const emptyChart = (
			<div
				className="flex w-full items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
				style={{ minHeight: chartHeightPx ?? 88 }}
			>
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);

		if (alwaysShowChips && hasStages) {
			return (
				<div className="flex w-full flex-col gap-1 px-1 pt-1">
					{chipRow}
					{emptyChart}
				</div>
			);
		}

		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-xs text-zinc-400">고도 데이터가 없습니다</p>
			</div>
		);
	}

	const pendingStage = pendingStageEdit
		? (stages.find((s) => s.id === pendingStageEdit.stageId) ?? null)
		: null;
	const boundaryKmForHandle = pendingStageEdit
		? pendingStageEdit.previewEndKm
		: (selectedStage?.endDistanceKm ?? 0);

	// Stage 경계선: 표시 구간 내의 것만. pending인 경계는 별도 처리 (점선+실선)
	const stageBoundaries = stages
		.map((s) => ({ distanceKm: s.endDistanceKm, stageId: s.id, label: `Stage ${s.dayNumber}` }))
		.filter(
			(b) =>
				b.distanceKm >= visibleStart &&
				b.distanceKm <= visibleEnd &&
				!(pendingStageEdit && b.stageId === pendingStageEdit.stageId),
		);

	const stageEndBoundaryHitLeftPct =
		canDragBoundary && visibleEnd > visibleStart
			? Math.max(
					0,
					Math.min(100, ((boundaryKmForHandle - visibleStart) / (visibleEnd - visibleStart)) * 100),
				)
			: null;

	return (
		<div
			className={
				chartHeightPx != null
					? tightFixedHeightChart
						? "flex w-full flex-col gap-1 pl-1 pr-2 pt-1.5"
						: "flex w-full flex-col gap-1 px-2 pt-2"
					: "flex h-full w-full flex-col gap-1 px-2 pt-2"
			}
		>
			{hideChips ? null : alwaysShowChips && hasStages ? (
				<DayStagePillChips
					stages={stages}
					selectedDayNumber={selectedDayNumber}
					onSelectedDayChange={onSelectedDayChange}
				/>
			) : (
				<ElevationProfileHeader
					totalKm={totalKm}
					stages={stages}
					selectedDayNumber={selectedDayNumber}
					activeStageId={activeStageId}
					onSelectedDayChange={onSelectedDayChange}
				/>
			)}

			{/* 클라임 카드 */}
			{climbProfile && (
				<ClimbCard
					summitName={focusedSummit?.name ?? "고개"}
					profile={climbProfile}
					onDismiss={
						!disablePinAndHoverScrub ? () => setClimbZoomSummitKey(null) : undefined
					}
					climbRange={effectiveClimbRange}
					onClimbRangeChange={setClimbRange}
					visibleModes={visibleClimbModes}
				/>
			)}

			{/* 차트 */}
			<div
				ref={chartContainerRef}
				className={
					chartHeightPx != null
						? "relative w-full shrink-0 overflow-visible"
						: "relative min-h-0 flex-1 overflow-visible"
				}
				style={chartHeightPx != null ? { height: chartHeightPx } : undefined}
			>
				{pendingStageEdit != null && (
					<div className="pointer-events-none absolute inset-0 z-30">
						<div className="pointer-events-auto absolute top-2 right-2 flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95">
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
								className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
							>
								적용
							</button>
						</div>
					</div>
				)}
				<ElevationAreaChart
					chartHeightPx={chartHeightPx}
					chartData={chartData}
					effectiveChartMargin={effectiveChartMargin}
					chartInteractionDisabled={chartInteractionDisabled}
					handleMouseMove={handleMouseMove}
					handleMouseLeave={handleMouseLeave}
					handleChartClick={handleChartClick}
					stages={stages}
					activeStageId={activeStageId}
					hasStages={hasStages}
					stageKeys={stageKeys}
					selectedDayNumber={selectedDayNumber}
					visibleStart={visibleStart}
					visibleEnd={visibleEnd}
					climbProfile={climbProfile}
					climbGradientFillStops={climbGradientFillStops}
					showGradientStrip={showGradientStrip}
					gradientSegments={gradientSegments}
					tightFixedHeightChart={tightFixedHeightChart}
					compactYAxis={compactYAxis}
					stageBoundaries={stageBoundaries}
					isHoveringStageEndBoundary={isHoveringStageEndBoundary}
					selectedStage={selectedStage}
					pendingStageEdit={pendingStageEdit}
					pendingStage={pendingStage}
					visibleCPs={visibleCPs}
					visibleSummits={visibleSummits}
					cpNameVisible={cpNameVisible}
					summitNameVisible={summitNameVisible}
					labelRowByKey={labelRowByKey}
					planPoiFocusInView={planPoiFocusInView}
					scheduleMarkerFocus={scheduleMarkerFocus}
					scheduleSelectionOverlay={scheduleSelectionOverlay}
					currentChartDatum={currentChartDatum}
					effectiveClimbZoomSummitKey={effectiveClimbZoomSummitKey}
					handleSummitClick={handleSummitClick}
				/>
				{scheduleSelectionOverlay != null && scheduleTooltipStyle != null ? (
					<ScheduleSelectionKmEleTooltip
						km={scheduleSelectionOverlay.km}
						ele={scheduleSelectionOverlay.ele}
						compactTooltip={compactTooltip}
						style={{
							left: scheduleTooltipStyle.left,
							top: scheduleTooltipStyle.top,
							transform: scheduleTooltipStyle.transform,
						}}
					/>
				) : null}
				{/* 호버/핀 공용 툴팁 — 클라임 줌 시 클라임 전용 툴팁으로 교체 */}
				{!chartInteractionDisabled &&
				currentChartDatum != null &&
				hoverTooltipPlacementStyle != null ? (
					climbProfile != null ? (
						<ClimbHoverTooltip
							datum={currentChartDatum}
							climbProfile={climbProfile}
							trackPoints={trackPoints}
							elevationCalibratedThreshold={elevationCalibratedThreshold}
							compactTooltip={compactTooltip}
							pinned={isPinned}
							placementStyle={hoverTooltipPlacementStyle}
							onUnpin={onUnpin}
							gradientPct={hoveredGradientPct}
						/>
					) : (
						<ElevationHoverTooltip
							datum={currentChartDatum}
							trackPoints={trackPoints}
							cpMarkers={cpMarkers}
							elevationCalibratedThreshold={elevationCalibratedThreshold}
							cpAnchorMinKm={tooltipCpAnchorKm}
							cpAnchorMaxKm={tooltipCpAnchorMaxKm}
							anchorFallbackDayNumber={tooltipAnchorDayNumber}
							compactTooltip={compactTooltip}
							pinned={isPinned}
							placementStyle={hoverTooltipPlacementStyle}
							onUnpin={onUnpin}
						/>
					)
				) : null}
				{canDragBoundary && selectedStage && stageEndBoundaryHitLeftPct != null ? (
					<StageBoundaryOverlay
						selectedStage={selectedStage}
						stageEndBoundaryHitLeftPct={stageEndBoundaryHitLeftPct}
						stageEndBoundaryChartEditMode={stageEndBoundaryChartEditMode}
						stageEndBoundaryMenuAnchor={stageEndBoundaryMenuAnchor}
						stageEndBoundaryMenuPosition={stageEndBoundaryMenuPosition}
						onHoverBoundary={setIsHoveringStageEndBoundary}
						onDismissMenu={() => setStageEndBoundaryMenuAnchor(null)}
						onOpenMenuAnchor={setStageEndBoundaryMenuAnchor}
						onStartBoundaryDrag={onStartBoundaryDrag}
						onStageEndBoundaryEditMapCenter={onStageEndBoundaryEditMapCenter}
						beginBoundaryWindowDrag={beginBoundaryWindowDrag}
						pendingStageEdit={pendingStageEdit}
						pendingStage={pendingStage}
						previewStageStats={previewStageStats}
						boundaryKmForHandle={boundaryKmForHandle}
						visibleStart={visibleStart}
						visibleEnd={visibleEnd}
						stageEndBoundaryHitStripRef={stageEndBoundaryHitStripRef}
						stageEndBoundaryMenuRef={stageEndBoundaryMenuRef}
						chartContainerRef={chartContainerRef}
					/>
				) : null}
			</div>
		</div>
	);
}
