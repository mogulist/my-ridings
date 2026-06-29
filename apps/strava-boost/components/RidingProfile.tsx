"use client";

import type { PauseSegment, ProfilePoint } from "@my-ridings/elevation-profile";
import {
	formatAbsoluteTimeAxis,
	formatAbsoluteTimeTooltip,
	formatDistanceAxis,
	formatRelativeTimeAxis,
	fromStravaStreams,
	GradientStrip,
	MarkerOverlay,
	nearestProfilePoint,
	profilePointToXValue,
	SelectionOverlay,
	summitsToMarkers,
	useZoomState,
	waypointsToMarkers,
} from "@my-ridings/elevation-profile";
import {
	calibrateThreshold,
	computeGradientSegments,
	computeTrackElevationGainLoss,
} from "@my-ridings/plan-geometry";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TooltipContentProps } from "recharts";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceArea,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { detectPauses } from "@/lib/riding-profile-utils";
import { parseStravaLocalDate } from "@/lib/strava-date";
import type { ActivityStreams, EventInfo, StravaActivity, SummitPoi, XAxisMode } from "@/src/types";

type SelectionBounds = {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
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

const YAXIS_W = 45;
const CHART_MARGIN_R = 10;
const LABEL_TIERS = 3;
const LABEL_ROW_HEIGHT = 13;
const LABEL_GAP_PX = 24;
const POI_TOP_MARGIN = LABEL_GAP_PX + LABEL_TIERS * LABEL_ROW_HEIGHT + 4;

function CustomTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload as ProfilePoint;
	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
			<p className="font-semibold text-gray-800">고도 {Math.round(point.elevationM)} m</p>
			<p className="text-gray-500">거리 {point.distanceKm.toFixed(1)} km</p>
			<p className="text-gray-500">
				경과 {point.elapsedSeconds != null ? formatRelativeTimeAxis(point.elapsedSeconds) : "-"}
			</p>
			<p className="text-gray-500">
				{point.absoluteMs != null ? formatAbsoluteTimeTooltip(point.absoluteMs) : ""}
			</p>
		</div>
	);
}

export function RidingProfile({
	activity,
	streams,
	onHoverPoint,
	summits = [],
	eventInfo = null,
	onSelectionChange,
}: Props) {
	const [xAxisMode, setXAxisMode] = useState<XAxisMode>("distance");

	const startMs = useMemo(
		() => parseStravaLocalDate(activity.start_date_local).getTime(),
		[activity.start_date_local],
	);

	// ProfilePoint[] 로 정규화 (패키지 어댑터 사용)
	const profileData = useMemo(() => fromStravaStreams(streams, startMs), [streams, startMs]);

	// 일시 정지 구간 (속도 기반, strava-boost 고유 알고리즘 유지)
	const pauses = useMemo(() => detectPauses(streams, startMs), [streams, startMs]);

	// 경사도 세그먼트 계산용 TrackPoint
	const trackPoints = useMemo(() => {
		const len = Math.min(streams.altitude.length, streams.distance.length);
		return Array.from({ length: len }, (_, i) => ({
			x: streams.latlng?.[i]?.[1] ?? 0,
			y: streams.latlng?.[i]?.[0] ?? 0,
			e: streams.altitude[i],
			d: streams.distance[i],
		}));
	}, [streams]);

	const gradientSegments = useMemo(() => computeGradientSegments(trackPoints), [trackPoints]);

	// 마커: summit + 이벤트 웨이포인트
	const markers = useMemo(
		() => [
			...summitsToMarkers(summits),
			...waypointsToMarkers(eventInfo?.waypoints ?? [], startMs),
		],
		[summits, eventInfo, startMs],
	);

	// 드래그 줌 상태
	const containerRef = useRef<HTMLDivElement>(null);
	const zoomState = useZoomState({
		data: profileData,
		xAxisMode,
		yAxisWidth: YAXIS_W,
		chartMarginRight: CHART_MARGIN_R,
		containerRef,
	});
	const {
		zoomDomain,
		selection,
		drag,
		clearSelection,
		handleMouseDown,
		setDraggingHandle,
		pointAtClientX,
	} = zoomState;

	// 구간 획득고도 계산 (calibrated threshold)
	const calibratedThreshold = useMemo(
		() => calibrateThreshold(trackPoints, activity.total_elevation_gain ?? 0),
		[trackPoints, activity.total_elevation_gain],
	);

	const selectionStats = useMemo(() => {
		if (!selection) return null;
		const { gain } = computeTrackElevationGainLoss(
			trackPoints,
			selection.startKm,
			selection.endKm,
			calibratedThreshold,
		);
		return { distanceKm: selection.endKm - selection.startKm, gain };
	}, [selection, trackPoints, calibratedThreshold]);

	// 선택 구간 GPS 바운딩 박스 → 지도 연동
	useEffect(() => {
		if (!onSelectionChange) return;
		if (!selection) {
			onSelectionChange(null);
			return;
		}
		const startM = selection.startKm * 1000;
		const endM = selection.endKm * 1000;
		let minLat = Infinity,
			maxLat = -Infinity,
			minLng = Infinity,
			maxLng = -Infinity;
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
	}, [selection, trackPoints, onSelectionChange]);

	// Y축 범위
	const visibleElevations = useMemo(() => {
		const pts = zoomDomain
			? profileData.filter(
					(p) => p.distanceKm >= zoomDomain.startKm && p.distanceKm <= zoomDomain.endKm,
				)
			: profileData;
		return (pts.length > 0 ? pts : profileData).map((p) => p.elevationM);
	}, [profileData, zoomDomain]);

	const minAlt = Math.max(0, Math.min(...visibleElevations) - 20);
	const peakAlt = Math.max(...visibleElevations);
	const maxAlt = peakAlt + Math.max((peakAlt - minAlt) * 0.08, 10);

	// X축 도메인
	const xDomain = useMemo<[number | string, number | string]>(() => {
		if (!zoomDomain) return ["dataMin", "dataMax"];
		const s = nearestProfilePoint(zoomDomain.startKm, profileData);
		const e = nearestProfilePoint(zoomDomain.endKm, profileData);
		if (!s || !e) return ["dataMin", "dataMax"];
		return [profilePointToXValue(s, xAxisMode), profilePointToXValue(e, xAxisMode)];
	}, [zoomDomain, profileData, xAxisMode]);

	const xDataKey: keyof ProfilePoint =
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

	// hover → GPS 좌표 → 지도 마커
	function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
		if (!onHoverPoint) return;
		const point = pointAtClientX(e.clientX);
		if (!point) return;
		const latlng = streams.latlng?.[point.sourceIndex];
		onHoverPoint(latlng ?? null);
	}

	function handleMouseLeave() {
		onHoverPoint?.(null);
	}

	// 우클릭 컨텍스트 메뉴 (좌표·거리·고도 복사)
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		point: ProfilePoint;
	} | null>(null);
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

	const showGradientStrip = xAxisMode === "distance" && gradientSegments.length > 0;

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
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onContextMenu={handleContextMenu}
			>
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart
						data={profileData}
						margin={{
							top: POI_TOP_MARGIN,
							right: CHART_MARGIN_R,
							left: 0,
							bottom: showGradientStrip ? 28 : 16,
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
							dataKey={xDataKey}
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
							width={YAXIS_W}
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
									// biome-ignore lint/suspicious/noArrayIndexKey: positional
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
							dataKey="elevationM"
							stroke="#f97316"
							strokeWidth={1.5}
							fill="url(#ridingGradient)"
							isAnimationActive={false}
							dot={false}
							activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
						/>

						<MarkerOverlay markers={markers} data={profileData} xAxisMode={xAxisMode} />

						<SelectionOverlay
							range={drag ?? selection}
							showHandles={!drag && zoomDomain != null}
							xAxisMode={xAxisMode}
							data={profileData}
							onHandleMouseDown={setDraggingHandle}
						/>

						{showGradientStrip && <GradientStrip segments={gradientSegments} />}
					</AreaChart>
				</ResponsiveContainer>
			</div>

			{contextMenu &&
				(() => {
					const { point } = contextMenu;
					const latlng = streams.latlng?.[point.sourceIndex];
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
								📍 위경도 좌표 복사
								{latlng ? ` (${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)})` : ""}
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
								onClick={() => copyToClipboard(String(Math.round(point.elevationM)), "고도")}
								className="block w-full px-2.5 py-1 text-left text-gray-700 hover:bg-gray-100"
							>
								⛰️ 고도 복사 ({Math.round(point.elevationM)} m)
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
