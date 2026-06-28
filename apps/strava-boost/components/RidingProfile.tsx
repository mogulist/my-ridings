"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceArea,
	usePlotArea,
	useXAxisScale,
	useYAxisScale,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import {
	computeGradientSegments,
	DOWNHILL_COLOR,
	calibrateThreshold,
	computeTrackElevationGainLoss,
} from "@my-ridings/plan-geometry";
import type { GradientSegment } from "@my-ridings/plan-geometry";
import type { StravaActivity, ActivityStreams, XAxisMode, ChartPoint, PauseSegment, SummitPoi, EventInfo } from "@/src/types";
import { parseStravaLocalDate } from "@/lib/strava-date";
import {
	buildChartData,
	detectPauses,
	formatDistanceAxis,
	formatRelativeTimeAxis,
	formatAbsoluteTimeAxis,
	formatAbsoluteTimeTooltip,
} from "@/lib/riding-profile-utils";

type SelectionBounds = {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
	/** 선택 구간의 경로 좌표 [lat, lng][] (지도에 강조 표시용) */
	polyline: [number, number][];
};

type Props = {
	activity: StravaActivity;
	streams: ActivityStreams;
	onHoverPoint?: (pos: [number, number] | null) => void;
	summits?: SummitPoi[];
	eventInfo?: EventInfo | null;
	onSelectionChange?: (bounds: SelectionBounds | null) => void;
};

const X_AXIS_MODES: { value: XAxisMode; label: string }[] = [
	{ value: "distance", label: "거리" },
	{ value: "relative-time", label: "상대 시간" },
	{ value: "absolute-time", label: "절대 시간" },
];

const GRADIENT_STRIP_HEIGHT = 8;
const GRADIENT_STRIP_TOP_GAP = 18;
const YAXIS_W = 45;
const CHART_MARGIN_R = 10;

function GradientStripOverlay({ segments }: { segments: GradientSegment[] }) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	if (!plotArea || !xScale || plotArea.width <= 0) return null;
	const { x, y, width, height } = plotArea;
	const stripY = y + height + GRADIENT_STRIP_TOP_GAP;
	return (
		<g>
			<defs>
				<clipPath id="gradStrip">
					<rect x={x} y={stripY} width={width} height={GRADIENT_STRIP_HEIGHT} rx={2} />
				</clipPath>
			</defs>
			<g clipPath="url(#gradStrip)">
				{segments.map((seg, i) => {
					if (seg.color === DOWNHILL_COLOR) return null;
					const x1 = xScale(seg.startKm);
					const x2 = xScale(seg.endKm);
					if (x1 == null || x2 == null || x2 <= x1) return null;
					return (
						<rect
							key={i}
							x={x1}
							y={stripY}
							width={x2 - x1}
							height={GRADIENT_STRIP_HEIGHT}
							fill={seg.color}
						/>
					);
				})}
			</g>
		</g>
	);
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload as ChartPoint;

	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
			<p className="font-semibold text-gray-800">고도 {point.altitude} m</p>
			<p className="text-gray-500">거리 {point.distanceKm.toFixed(1)} km</p>
			<p className="text-gray-500">
				경과 {formatRelativeTimeAxis(point.elapsedSeconds)}
			</p>
			<p className="text-gray-500">
				{formatAbsoluteTimeTooltip(point.absoluteMs)}
			</p>
		</div>
	);
}

const WAYPOINT_COLORS: Record<string, string> = {
	summit:     "#7c3aed",
	supply:     "#2563eb",
	water:      "#0891b2",
	cutoff:     "#dc2626",
	checkpoint: "#16a34a",
	start:      "#16a34a",
	finish:     "#1d4ed8",
	rest:       "#6b7280",
};

function formatCutoffTime(startMs: number, cutoffSeconds: number): string {
	const ms = startMs + cutoffSeconds * 1000;
	return new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** 누적 거리(km) 기준으로 가장 가까운 ChartPoint 반환 */
function nearestChartPoint(distKm: number, data: ChartPoint[]): ChartPoint | null {
	if (data.length === 0) return null;
	let lo = 0, hi = data.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (data[mid].distanceKm < distKm) lo = mid + 1;
		else hi = mid;
	}
	return data[lo];
}

function chartPointToXValue(point: ChartPoint, mode: XAxisMode): number {
	if (mode === "distance") return point.distanceKm;
	return mode === "relative-time" ? point.elapsedSeconds : point.absoluteMs;
}

type PoiMarker = {
	id: string;
	label: string;
	color: string;
	xValue: number;
	altitude: number;
};

type KmRange = { start: number; end: number };

const MIN_SELECTION_KM = 0.1;
// 줌인 시 선택 구간 좌우로 추가하는 여백 비율 (핸들을 바깥쪽으로 드래그할 수 있도록)
const ZOOM_PADDING_RATIO = 0.15;
const SELECTION_FILL = "rgba(59,130,246,0.12)";
const SELECTION_HANDLE_COLOR = "#3b82f6";
const SELECTION_HANDLE_WIDTH = 2;
const SELECTION_HANDLE_HIT_WIDTH = 12;

const POI_LABEL_TIERS = 3;
const POI_LABEL_ROW_HEIGHT = 13;
const POI_LABEL_CHAR_WIDTH = 7;
// 가장 높은 지점(플롯 영역 상단)과 1단 라벨 사이의 최소 간격
const POI_LABEL_GAP_PX = 24;
// 차트 위 여백: 간격 + 라벨 단(tier) 수만큼 + 약간의 여유
const POI_OVERLAY_TOP_MARGIN = POI_LABEL_GAP_PX + POI_LABEL_TIERS * POI_LABEL_ROW_HEIGHT + 4;

/** 곡선 위 작은 점 마커 + 상단 다단 라벨 + 라벨↔지점 연결 점선 */
function PoiOverlay({ markers }: { markers: PoiMarker[] }) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	const yScale = useYAxisScale();
	if (!plotArea || !xScale || !yScale || markers.length === 0) return null;

	const positioned = markers
		.map((m) => {
			const px = xScale(m.xValue);
			const py = yScale(m.altitude);
			if (px == null || py == null) return null;
			return { ...m, px, py };
		})
		.filter((m): m is PoiMarker & { px: number; py: number } => m !== null)
		// 줌인 시 플롯 영역 밖으로 벗어난 마커는 제외
		.filter((m) => m.px >= plotArea.x && m.px <= plotArea.x + plotArea.width)
		.sort((a, b) => a.px - b.px);

	// 가로 위치 기준 충돌 회피: 겹치면 다음 단으로 내림 (최대 3단)
	const tierEndX: number[] = new Array(POI_LABEL_TIERS).fill(-Infinity);
	const tiered = positioned.map((m) => {
		const halfWidth = (m.label.length * POI_LABEL_CHAR_WIDTH) / 2 + 4;
		let tier = 0;
		while (tier < POI_LABEL_TIERS - 1 && m.px - halfWidth < tierEndX[tier]) tier++;
		tierEndX[tier] = m.px + halfWidth;
		return { ...m, tier };
	});

	return (
		<g style={{ pointerEvents: "none" }}>
			{tiered.map((m) => {
				const labelY = plotArea.y - POI_LABEL_GAP_PX - m.tier * POI_LABEL_ROW_HEIGHT - 4;
				return (
					<g key={m.id}>
						<line
							x1={m.px}
							y1={labelY + 3}
							x2={m.px}
							y2={m.py}
							stroke={m.color}
							strokeWidth={1}
							strokeDasharray="2 2"
							opacity={0.35}
						/>
						<circle cx={m.px} cy={m.py} r={4} fill="#fff" stroke={m.color} strokeWidth={2} />
						<text
							x={m.px}
							y={labelY}
							fill={m.color}
							fontSize={9}
							fontWeight={600}
							textAnchor="middle"
							style={{ userSelect: "none" }}
						>
							{m.label}
						</text>
					</g>
				);
			})}
		</g>
	);
}

/** 드래그 선택 영역(반투명 음영) + 줌 중일 때만 보이는 좌우 경계 핸들 */
function SelectionOverlay({
	range,
	showHandles,
	xAxisMode,
	chartData,
	onHandleMouseDown,
}: {
	range: KmRange | null;
	showHandles: boolean;
	xAxisMode: XAxisMode;
	chartData: ChartPoint[];
	onHandleMouseDown: (handle: "start" | "end") => void;
}) {
	const plotArea = usePlotArea();
	const xScale = useXAxisScale();
	if (!plotArea || !xScale || !range) return null;

	const lo = Math.min(range.start, range.end);
	const hi = Math.max(range.start, range.end);
	const startPt = nearestChartPoint(lo, chartData);
	const endPt = nearestChartPoint(hi, chartData);
	if (!startPt || !endPt) return null;

	const x1 = xScale(chartPointToXValue(startPt, xAxisMode));
	const x2 = xScale(chartPointToXValue(endPt, xAxisMode));
	if (x1 == null || x2 == null) return null;

	const left = Math.min(x1, x2);
	const width = Math.abs(x2 - x1);

	return (
		<g>
			<rect
				x={left}
				y={plotArea.y}
				width={width}
				height={plotArea.height}
				fill={SELECTION_FILL}
				style={{ pointerEvents: "none" }}
			/>
			{showHandles && (
				<>
					<g style={{ cursor: "ew-resize" }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onHandleMouseDown("start"); }}>
						<rect x={x1 - SELECTION_HANDLE_HIT_WIDTH / 2} y={plotArea.y} width={SELECTION_HANDLE_HIT_WIDTH} height={plotArea.height} fill="transparent" />
						<rect x={x1 - SELECTION_HANDLE_WIDTH / 2} y={plotArea.y} width={SELECTION_HANDLE_WIDTH} height={plotArea.height} fill={SELECTION_HANDLE_COLOR} style={{ pointerEvents: "none" }} />
					</g>
					<g style={{ cursor: "ew-resize" }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onHandleMouseDown("end"); }}>
						<rect x={x2 - SELECTION_HANDLE_HIT_WIDTH / 2} y={plotArea.y} width={SELECTION_HANDLE_HIT_WIDTH} height={plotArea.height} fill="transparent" />
						<rect x={x2 - SELECTION_HANDLE_WIDTH / 2} y={plotArea.y} width={SELECTION_HANDLE_WIDTH} height={plotArea.height} fill={SELECTION_HANDLE_COLOR} style={{ pointerEvents: "none" }} />
					</g>
				</>
			)}
		</g>
	);
}

export function RidingProfile({ activity, streams, onHoverPoint, summits = [], eventInfo = null, onSelectionChange }: Props) {
	const [xAxisMode, setXAxisMode] = useState<XAxisMode>("distance");

	const startMs = useMemo(
		() => parseStravaLocalDate(activity.start_date_local).getTime(),
		[activity.start_date_local],
	);
	const chartData = useMemo(() => buildChartData(streams, startMs), [streams, startMs]);
	const pauses = useMemo(() => detectPauses(streams, startMs), [streams, startMs]);

	// plan-geometry용 TrackPoint 변환 (altitude + distance만 사용하므로 latlng 불필요)
	const trackPoints = useMemo(() => {
		const len = Math.min(streams.altitude.length, streams.distance.length);
		return Array.from({ length: len }, (_, i) => ({
			x: streams.latlng?.[i]?.[1] ?? 0,
			y: streams.latlng?.[i]?.[0] ?? 0,
			e: streams.altitude[i],
			d: streams.distance[i],
		}));
	}, [streams]);

	const gradientSegments = useMemo(
		() => computeGradientSegments(trackPoints),
		[trackPoints],
	);

	// 구간 선택 (드래그 줌)
	// zoomDomainKm: 줌인된 차트 x축 범위 (한 번 설정되면 "선택 해제" 전까지 고정)
	// selectionKm: 통계 계산용 선택 구간 (줌 범위 내에서 핸들로 미세조정 가능)
	// dragKm: 줌 안 된 상태에서 드래그 중인 미리보기 구간
	const [zoomDomainKm, setZoomDomainKm] = useState<KmRange | null>(null);
	const [selectionKm, setSelectionKm] = useState<KmRange | null>(null);
	const [dragKm, setDragKm] = useState<KmRange | null>(null);
	const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | null>(null);

	function clearSelection() {
		setZoomDomainKm(null);
		setSelectionKm(null);
		setDragKm(null);
	}

	// RideWithGPS 전체 elevation_gain과 일치하도록 calibration된 threshold (구간 획득고도 계산에 재사용)
	const calibratedThreshold = useMemo(
		() => calibrateThreshold(trackPoints, activity.total_elevation_gain ?? 0),
		[trackPoints, activity.total_elevation_gain],
	);

	const selectionStats = useMemo(() => {
		if (!selectionKm) return null;
		const { gain } = computeTrackElevationGainLoss(trackPoints, selectionKm.start, selectionKm.end, calibratedThreshold);
		return { distanceKm: selectionKm.end - selectionKm.start, gain };
	}, [selectionKm, trackPoints, calibratedThreshold]);

	// 선택 구간의 GPS 바운딩 박스 → 지도 줌 연동
	useEffect(() => {
		if (!onSelectionChange) return;
		if (!selectionKm) {
			onSelectionChange(null);
			return;
		}
		const startM = selectionKm.start * 1000;
		const endM = selectionKm.end * 1000;
		let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
		const polyline: [number, number][] = [];
		for (const p of trackPoints) {
			if (p.d < startM || p.d > endM) continue;
			if (p.x === 0 && p.y === 0) continue;
			if (p.y < minLat) minLat = p.y;
			if (p.y > maxLat) maxLat = p.y;
			if (p.x < minLng) minLng = p.x;
			if (p.x > maxLng) maxLng = p.x;
			polyline.push([p.y, p.x]);
		}
		onSelectionChange(minLat === Infinity ? null : { minLat, maxLat, minLng, maxLng, polyline });
	}, [selectionKm, trackPoints, onSelectionChange]);

	const poiMarkers = useMemo<PoiMarker[]>(() => {
		const markers: PoiMarker[] = [];

		for (const summit of summits) {
			const point = nearestChartPoint(summit.distanceKm, chartData);
			if (!point) continue;
			markers.push({
				id: `summit-${summit.id}`,
				label: summit.name,
				color: WAYPOINT_COLORS.summit,
				xValue: chartPointToXValue(point, xAxisMode),
				altitude: point.altitude,
			});
		}

		for (const wp of eventInfo?.waypoints ?? []) {
			const point = nearestChartPoint(wp.distanceKm, chartData);
			if (!point) continue;
			const label =
				wp.waypoint_type === "cutoff" && wp.cutoff_seconds_from_start != null
					? `${wp.name} (${formatCutoffTime(startMs, wp.cutoff_seconds_from_start)})`
					: wp.name;
			markers.push({
				id: `wp-${wp.id}`,
				label,
				color: WAYPOINT_COLORS[wp.waypoint_type] ?? WAYPOINT_COLORS.checkpoint,
				xValue: chartPointToXValue(point, xAxisMode),
				altitude: point.altitude,
			});
		}

		return markers;
	}, [summits, eventInfo, chartData, xAxisMode, startMs]);

	const xAxisDataKey: keyof ChartPoint =
		xAxisMode === "distance"
			? "distanceKm"
			: xAxisMode === "relative-time"
				? "elapsedSeconds"
				: "absoluteMs";

	const xTickFormatter = (v: number) => {
		if (xAxisMode === "distance") return formatDistanceAxis(v);
		if (xAxisMode === "relative-time") return formatRelativeTimeAxis(v);
		return formatAbsoluteTimeAxis(v);
	};

	// 줌인 상태에서는 보이는 구간만 기준으로 Y축 범위를 재계산
	const visibleAltitudes = zoomDomainKm
		? chartData
				.filter((p) => p.distanceKm >= zoomDomainKm.start && p.distanceKm <= zoomDomainKm.end)
				.map((p) => p.altitude)
		: chartData.map((p) => p.altitude);
	const altitudes = visibleAltitudes.length > 0 ? visibleAltitudes : chartData.map((p) => p.altitude);
	const minAlt = Math.max(0, Math.min(...altitudes) - 20);
	// Y축 최고 고도를 가장 높은 지점보다 약간 높게 잡아 여유 공간을 둔다.
	// - allowDataOverflow로 인한 clipPath가 정점의 stroke를 살짝 잘라내는 것을 방지
	// - 정점이 plot 영역 맨 위 경계에 딱 붙으면 선택 핸들의 hover 영역과 겹쳐
	//   커서가 바뀌지 않는 문제가 있어, 여유를 두어 핸들을 잡기 쉽게 함
	const peakAlt = Math.max(...altitudes);
	const maxAlt = peakAlt + Math.max((peakAlt - minAlt) * 0.08, 10);

	// 줌인 상태에서는 x축 도메인을 selectionKm에 고정 (핸들 드래그로 보이는 범위는 바뀌지 않음)
	const xDomain = useMemo<[number | string, number | string]>(() => {
		if (!zoomDomainKm) return ["dataMin", "dataMax"];
		const startPt = nearestChartPoint(zoomDomainKm.start, chartData);
		const endPt = nearestChartPoint(zoomDomainKm.end, chartData);
		if (!startPt || !endPt) return ["dataMin", "dataMax"];
		return [chartPointToXValue(startPt, xAxisMode), chartPointToXValue(endPt, xAxisMode)];
	}, [zoomDomainKm, chartData, xAxisMode]);

	// recharts onMouseMove는 numeric XAxis에서 activePayload를 신뢰할 수 없음.
	// 대신 wrapper div의 네이티브 mousemove로 픽셀 → 데이터 직접 변환.
	const containerRef = useRef<HTMLDivElement>(null);

	// 현재 화면에 보이는 x축 범위 (현재 x축 모드 단위). 줌인 상태면 zoomDomainKm 기준.
	function currentXDomain(): [number, number] | null {
		if (chartData.length < 2) return null;
		if (zoomDomainKm) {
			const startPt = nearestChartPoint(zoomDomainKm.start, chartData);
			const endPt = nearestChartPoint(zoomDomainKm.end, chartData);
			if (!startPt || !endPt) return null;
			return [chartPointToXValue(startPt, xAxisMode), chartPointToXValue(endPt, xAxisMode)];
		}
		return [chartPointToXValue(chartData[0], xAxisMode), chartPointToXValue(chartData[chartData.length - 1], xAxisMode)];
	}

	// 주어진 x축 범위 [xMin, xMax] 내에서 fraction(0~1)에 해당하는 가장 가까운 ChartPoint
	function pointAtFraction(fraction: number, xMin: number, xMax: number): ChartPoint | null {
		if (chartData.length < 2 || xMax === xMin) return null;
		const getX = (p: ChartPoint) => chartPointToXValue(p, xAxisMode);
		const targetX = xMin + fraction * (xMax - xMin);

		// binary search: first index where getX >= targetX
		let lo = 0, hi = chartData.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (getX(chartData[mid]) < targetX) lo = mid + 1;
			else hi = mid;
		}
		const best =
			lo > 0 &&
			Math.abs(getX(chartData[lo - 1]) - targetX) <
				Math.abs(getX(chartData[lo]) - targetX)
				? lo - 1
				: lo;

		return chartData[best] ?? null;
	}

	// 클라이언트 픽셀 x좌표 → 플롯 영역 내 fraction(0~1).
	// clamp=true면 플롯 영역 밖이어도 0~1로 clamp (드래그용), false면 영역 밖일 때 null (hover용).
	function clientXToFraction(clientX: number, clamp: boolean): number | null {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const plotWidth = rect.width - YAXIS_W - CHART_MARGIN_R;
		if (plotWidth <= 0) return null;
		if (!clamp && (mouseX < YAXIS_W || mouseX > YAXIS_W + plotWidth)) return null;
		const fraction = (mouseX - YAXIS_W) / plotWidth;
		return clamp ? Math.min(1, Math.max(0, fraction)) : fraction;
	}

	function pointAtClientX(clientX: number, clamp = false): ChartPoint | null {
		const fraction = clientXToFraction(clientX, clamp);
		if (fraction == null) return null;
		const domain = currentXDomain();
		if (!domain) return null;
		return pointAtFraction(fraction, domain[0], domain[1]);
	}

	function handleWrapperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
		if (!onHoverPoint) return;
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		const latlng = streams.latlng?.[point.streamIndex];
		onHoverPoint(latlng ?? null);
	}

	function handleWrapperMouseLeave() {
		onHoverPoint?.(null);
	}

	// 줌 안 된 상태에서 좌클릭 드래그 시작 → 구간 선택
	function handleWrapperMouseDown(e: React.MouseEvent<HTMLDivElement>) {
		if (e.button !== 0 || zoomDomainKm) return;
		const point = pointAtClientX(e.clientX, true);
		if (!point) return;
		setDragKm({ start: point.distanceKm, end: point.distanceKm });
	}

	// 드래그 선택 / 핸들 드래그 진행 중일 때 document 레벨에서 마우스 이동·해제 추적
	useEffect(() => {
		if (!dragKm && !draggingHandle) return;

		function handleMove(e: MouseEvent) {
			const point = pointAtClientX(e.clientX, true);
			if (!point) return;

			if (draggingHandle && zoomDomainKm) {
				const clamped = Math.min(zoomDomainKm.end, Math.max(zoomDomainKm.start, point.distanceKm));
				setSelectionKm((prev) => {
					if (!prev) return prev;
					if (draggingHandle === "start") return { start: Math.min(clamped, prev.end), end: prev.end };
					return { start: prev.start, end: Math.max(clamped, prev.start) };
				});
			} else if (dragKm) {
				setDragKm((prev) => (prev ? { ...prev, end: point.distanceKm } : prev));
			}
		}

		function handleUp() {
			if (dragKm) {
				const start = Math.min(dragKm.start, dragKm.end);
				const end = Math.max(dragKm.start, dragKm.end);
				if (end - start >= MIN_SELECTION_KM) {
					const pad = (end - start) * ZOOM_PADDING_RATIO;
					const dataStart = chartData[0]?.distanceKm ?? start;
					const dataEnd = chartData[chartData.length - 1]?.distanceKm ?? end;
					setZoomDomainKm({
						start: Math.max(dataStart, start - pad),
						end: Math.min(dataEnd, end + pad),
					});
					setSelectionKm({ start, end });
				}
				setDragKm(null);
			}
			setDraggingHandle(null);
		}

		document.addEventListener("mousemove", handleMove);
		document.addEventListener("mouseup", handleUp);
		return () => {
			document.removeEventListener("mousemove", handleMove);
			document.removeEventListener("mouseup", handleUp);
		};
	}, [dragKm, draggingHandle, zoomDomainKm, chartData]);

	// 우클릭 시 해당 지점의 GPS 좌표/거리/고도를 복사할 수 있는 컨텍스트 메뉴
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number; point: ChartPoint } | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, point });
	}

	useEffect(() => {
		if (!contextMenu) return;
		const close = () => setContextMenu(null);
		document.addEventListener("click", close);
		return () => document.removeEventListener("click", close);
	}, [contextMenu]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 2000);
		return () => clearTimeout(timer);
	}, [toast]);

	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			setToast(`${label} 복사됨: ${text}`);
		} catch {
			setToast("복사 실패");
		}
		setContextMenu(null);
	}

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<div className="flex items-center justify-between flex-wrap gap-3 mb-4">
				<div className="flex items-center gap-2 flex-wrap">
					<h2 className="text-lg font-semibold text-gray-800">라이딩 프로필</h2>
					{selectionStats && (
						<div className="flex items-center gap-2">
							<span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
								거리 {selectionStats.distanceKm.toFixed(1)} km · 획득고도 +{selectionStats.gain} m
							</span>
							<button
								type="button"
								onClick={clearSelection}
								className="text-xs text-gray-400 hover:text-gray-600 underline"
							>
								선택 해제
							</button>
						</div>
					)}
				</div>
				<div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
					{X_AXIS_MODES.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => setXAxisMode(mode.value)}
							className={[
								"px-3 py-1.5 transition-colors",
								xAxisMode === mode.value
									? "bg-blue-600 text-white font-medium"
									: "bg-white text-gray-600 hover:bg-gray-50",
							].join(" ")}
						>
							{mode.label}
						</button>
					))}
				</div>
			</div>

			<div
				ref={containerRef}
				onMouseDown={handleWrapperMouseDown}
				onMouseMove={handleWrapperMouseMove}
				onMouseLeave={handleWrapperMouseLeave}
				onContextMenu={handleContextMenu}
			>
			<ResponsiveContainer width="100%" height={280}>
				<AreaChart
					data={chartData}
					margin={{
						top: POI_OVERLAY_TOP_MARGIN,
						right: 10,
						left: 0,
						bottom: xAxisMode === "distance" && gradientSegments.length > 0 ? 28 : 16,
					}}
				>
					<defs>
						<linearGradient id="ridingGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
							<stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
					<XAxis
						dataKey={xAxisDataKey}
						type="number"
						domain={xDomain}
						allowDataOverflow
						tickFormatter={xTickFormatter}
						tick={{ fill: "#9ca3af", fontSize: 10 }}
						tickLine={false}
						axisLine={false}
						tickCount={6}
					/>
					<YAxis
						domain={[minAlt, maxAlt]}
						allowDataOverflow
						tickFormatter={(v: number) => `${v}m`}
						tick={{ fill: "#9ca3af", fontSize: 10 }}
						tickLine={false}
						axisLine={false}
						width={45}
					/>
					<Tooltip content={CustomTooltip} active={contextMenu ? false : undefined} />
					{pauses.map((pause: PauseSegment, i: number) => {
						const x1 =
							xAxisMode === "distance"
								? pause.distanceKmStart
								: xAxisMode === "relative-time"
									? pause.elapsedSecondsStart
									: pause.absoluteMsStart;
						const x2 =
							xAxisMode === "distance"
								? pause.distanceKmEnd
								: xAxisMode === "relative-time"
									? pause.elapsedSecondsEnd
									: pause.absoluteMsEnd;
						return (
							<ReferenceArea
								key={i}
								x1={x1}
								x2={x2}
								fill="rgba(156,163,175,0.35)"
								stroke="none"
							/>
						);
					})}
					<Area
						type="monotone"
						dataKey="altitude"
						stroke="#f97316"
						strokeWidth={1.5}
						fill="url(#ridingGradient)"
						isAnimationActive={false}
						dot={false}
						activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
					/>
					<PoiOverlay markers={poiMarkers} />
					<SelectionOverlay
						range={dragKm ?? selectionKm}
						showHandles={!dragKm && zoomDomainKm != null}
						xAxisMode={xAxisMode}
						chartData={chartData}
						onHandleMouseDown={setDraggingHandle}
					/>
					{xAxisMode === "distance" && gradientSegments.length > 0 && (
						<GradientStripOverlay segments={gradientSegments} />
					)}
				</AreaChart>
			</ResponsiveContainer>
			</div>

			{contextMenu && (() => {
				const { point } = contextMenu;
				const latlng = streams.latlng?.[point.streamIndex];
				return (
					<div
						className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-lg"
						style={{ left: contextMenu.x, top: contextMenu.y }}
						onContextMenu={(e) => e.preventDefault()}
					>
						<button
							type="button"
							disabled={!latlng}
							onClick={() =>
								latlng &&
								copyToClipboard(`${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)}`, "위경도 좌표")
							}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
						>
							📍 위경도 좌표 복사{latlng ? ` (${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)})` : ""}
						</button>
						<button
							type="button"
							onClick={() => copyToClipboard(point.distanceKm.toFixed(2), "경로 거리")}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100"
						>
							📏 경로 거리 복사 ({point.distanceKm.toFixed(2)} km)
						</button>
						<button
							type="button"
							onClick={() => copyToClipboard(String(Math.round(point.altitude)), "고도")}
							className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100"
						>
							⛰️ 고도 복사 ({Math.round(point.altitude)} m)
						</button>
					</div>
				);
			})()}

			{toast && (
				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
					{toast}
				</div>
			)}
		</div>
	);
}
