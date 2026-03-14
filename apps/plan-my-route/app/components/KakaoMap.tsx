"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";
import type { Stage } from "../types/plan";
import { getStageColor, UNPLANNED_COLOR } from "../types/plan";

// ── RideWithGPS 타입 ──────────────────────────────────────────────
export interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도
	d?: number; // 누적 거리
}

export interface PointOfInterest {
	id: number;
	name: string;
	lat: number;
	lng: number;
	poi_type_name: string;
}

export interface RideWithGPSRoute {
	id: number;
	name: string;
	distance: number;
	elevation_gain: number;
	elevation_loss: number;
	track_points: TrackPoint[];
	points_of_interest: PointOfInterest[];
}

// ── Kakao Maps 타입 ───────────────────────────────────────────────
declare global {
	interface Window {
		kakao?: {
			maps: KakaoMapsAPI;
		};
	}
}

interface KakaoMapsAPI {
	load: (callback: () => void) => void;
	Map: new (
		container: HTMLElement,
		options: { center: unknown; level: number },
	) => KakaoMapInstance;
	LatLng: new (lat: number, lng: number) => unknown;
	LatLngBounds: new () => KakaoLatLngBounds;
	Polyline: new (options: {
		map: KakaoMapInstance;
		path: unknown[];
		strokeWeight?: number;
		strokeColor?: string;
		strokeOpacity?: number;
		strokeStyle?: string;
	}) => void;
	Marker: new (options: {
		map: KakaoMapInstance;
		position: unknown;
		title?: string;
	}) => KakaoMarker;
	InfoWindow: new (options: {
		content: string;
		removable?: boolean;
	}) => KakaoInfoWindow;
	CustomOverlay: new (options: {
		map: KakaoMapInstance;
		position: unknown;
		content: string;
		yAnchor?: number;
		xAnchor?: number;
	}) => void;
	event: {
		addListener: (
			target: unknown,
			event: string,
			callback: () => void,
		) => void;
	};
}

interface KakaoMapInstance {
	setBounds: (bounds: unknown) => void;
}

interface KakaoLatLngBounds {
	extend: (latlng: unknown) => void;
}

interface KakaoMarker {
	getPosition: () => unknown;
}

interface KakaoInfoWindow {
	open: (map: KakaoMapInstance, marker: KakaoMarker) => void;
	close: () => void;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────
/** track_points를 거리 기준으로 구간 분할 */
function slicePointsByDistance(
	points: TrackPoint[],
	startKm: number,
	endKm: number,
): TrackPoint[] {
	const startM = startKm * 1000;
	const endM = endKm * 1000;
	return points.filter((p) => p.d != null && p.d >= startM && p.d <= endM);
}

// ── Props ─────────────────────────────────────────────────────────
interface KakaoMapProps {
	route?: RideWithGPSRoute | null;
	stages?: Stage[];
	activeStageId?: string | null;
	onStageHover?: (id: string | null) => void;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
export default function KakaoMap({
	route,
	stages = [],
	activeStageId,
}: KakaoMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const openInfoWindowRef = useRef<KakaoInfoWindow | null>(null);

	const drawRoute = useCallback(
		(kakaoMaps: KakaoMapsAPI, routeData: RideWithGPSRoute) => {
			if (!containerRef.current) return;

			const points = routeData.track_points;
			const firstPoint = points[0];

			const map = new kakaoMaps.Map(containerRef.current, {
				center: new kakaoMaps.LatLng(firstPoint.y, firstPoint.x),
				level: 12,
			});

			// Stage가 없는 경우: 기존처럼 단일 Polyline
			if (stages.length === 0) {
				const path = points.map(
					(p) => new kakaoMaps.LatLng(p.y, p.x),
				);
				new kakaoMaps.Polyline({
					map,
					path,
					strokeWeight: 4,
					strokeColor: "#FF4500",
					strokeOpacity: 0.85,
					strokeStyle: "solid",
				});

				const bounds = new kakaoMaps.LatLngBounds();
				for (const latlng of path) bounds.extend(latlng);
				map.setBounds(bounds);
			} else {
				const totalDistanceKm = routeData.distance / 1000;

				// Stage별 Polyline
				for (const stage of stages) {
					const stagePoints = slicePointsByDistance(
						points,
						stage.startDistanceKm,
						stage.endDistanceKm,
					);
					if (stagePoints.length < 2) continue;

					const color = getStageColor(stage.dayNumber);
					const isActive = stage.id === activeStageId;

					const path = stagePoints.map(
						(p) => new kakaoMaps.LatLng(p.y, p.x),
					);
					new kakaoMaps.Polyline({
						map,
						path,
						strokeWeight: isActive ? 6 : 4,
						strokeColor: color.stroke,
						strokeOpacity: isActive ? 1 : 0.8,
						strokeStyle: "solid",
					});

					// Stage 시작점 마커 (숫자 오버레이)
					const startPt = stagePoints[0];
					const content = `<div style="
						display:flex;align-items:center;justify-content:center;
						width:24px;height:24px;border-radius:50%;
						background:${color.stroke};color:white;
						font-size:12px;font-weight:700;
						border:2px solid white;
						box-shadow:0 2px 4px rgba(0,0,0,0.3);
					">${stage.dayNumber}</div>`;

					new kakaoMaps.CustomOverlay({
						map,
						position: new kakaoMaps.LatLng(startPt.y, startPt.x),
						content,
						yAnchor: 1.3,
						xAnchor: 0.5,
					});
				}

				// 미계획 구간 (마지막 Stage 끝 ~ 전체 끝)
				const lastStage = stages[stages.length - 1];
				if (lastStage.endDistanceKm < totalDistanceKm - 0.1) {
					const unplannedPoints = slicePointsByDistance(
						points,
						lastStage.endDistanceKm,
						totalDistanceKm,
					);
					if (unplannedPoints.length >= 2) {
						const path = unplannedPoints.map(
							(p) => new kakaoMaps.LatLng(p.y, p.x),
						);
						new kakaoMaps.Polyline({
							map,
							path,
							strokeWeight: 3,
							strokeColor: UNPLANNED_COLOR.stroke,
							strokeOpacity: 0.5,
							strokeStyle: "shortdash",
						});
					}
				}

				// 전체 경로 bounds
				const allPath = points.map(
					(p) => new kakaoMaps.LatLng(p.y, p.x),
				);
				const bounds = new kakaoMaps.LatLngBounds();
				for (const latlng of allPath) bounds.extend(latlng);
				map.setBounds(bounds);
			}

			// CP 마커
			for (const poi of routeData.points_of_interest) {
				const pos = new kakaoMaps.LatLng(poi.lat, poi.lng);
				const marker = new kakaoMaps.Marker({
					map,
					position: pos,
					title: poi.name,
				});

				const infoContent = `
					<div style="
						padding:8px 12px;font-size:13px;font-weight:600;color:#1a1a1a;
						background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);
						max-width:180px;line-height:1.4;
					">📍 ${poi.name}</div>`;
				const infoWindow = new kakaoMaps.InfoWindow({
					content: infoContent,
					removable: true,
				});

				kakaoMaps.event.addListener(marker, "click", () => {
					if (openInfoWindowRef.current)
						openInfoWindowRef.current.close();
					infoWindow.open(map, marker);
					openInfoWindowRef.current = infoWindow;
				});
			}

			// START / FINISH 마커
			const firstPos = new kakaoMaps.LatLng(firstPoint.y, firstPoint.x);
			const lastPoint = points[points.length - 1];
			const lastPos = new kakaoMaps.LatLng(lastPoint.y, lastPoint.x);
			new kakaoMaps.Marker({ map, position: firstPos, title: "START" });
			new kakaoMaps.Marker({ map, position: lastPos, title: "FINISH" });
		},
		[stages, activeStageId],
	);

	const handleScriptLoad = useCallback(() => {
		if (!window.kakao?.maps?.load || !route) return;
		window.kakao.maps.load(() => {
			if (!window.kakao?.maps) return;
			drawRoute(window.kakao.maps, route);
		});
	}, [drawRoute, route]);

	const containerCallbackRef = useCallback(
		(node: HTMLDivElement | null) => {
			(
				containerRef as React.MutableRefObject<HTMLDivElement | null>
			).current = node;
			if (!node || !route) return;
			if (window.kakao?.maps?.load) {
				window.kakao.maps.load(() => {
					if (!window.kakao?.maps) return;
					drawRoute(window.kakao.maps, route);
				});
			}
		},
		[drawRoute, route],
	);

	const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
	if (!appKey) {
		return (
			<div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					NEXT_PUBLIC_KAKAO_JS_KEY를 설정해 주세요.
				</p>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			<Script
				src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
				onLoad={handleScriptLoad}
				strategy="afterInteractive"
			/>
			<div ref={containerCallbackRef} className="h-full w-full" />
		</div>
	);
}
