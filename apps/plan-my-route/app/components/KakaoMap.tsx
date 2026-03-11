"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

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
function samplePoints(points: TrackPoint[], maxPoints = 3000): TrackPoint[] {
	if (points.length <= maxPoints) return points;
	const step = Math.ceil(points.length / maxPoints);
	return points.filter((_, i) => i % step === 0);
}

// ── Props ─────────────────────────────────────────────────────────
interface KakaoMapProps {
	/** 미리 fetch된 경로 데이터 (없으면 컴포넌트 내부에서 fetch) */
	route?: RideWithGPSRoute | null;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
export default function KakaoMap({ route }: KakaoMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const openInfoWindowRef = useRef<KakaoInfoWindow | null>(null);

	const drawRoute = useCallback(
		(kakaoMaps: KakaoMapsAPI, routeData: RideWithGPSRoute) => {
			if (!containerRef.current) return;

			const sampled = samplePoints(routeData.track_points);
			const firstPoint = sampled[0];

			const map = new kakaoMaps.Map(containerRef.current, {
				center: new kakaoMaps.LatLng(firstPoint.y, firstPoint.x),
				level: 12,
			});

			// Polyline
			const path = sampled.map((p) => new kakaoMaps.LatLng(p.y, p.x));
			new kakaoMaps.Polyline({
				map,
				path,
				strokeWeight: 4,
				strokeColor: "#FF4500",
				strokeOpacity: 0.85,
				strokeStyle: "solid",
			});

			// 지도 범위 자동 조정
			const bounds = new kakaoMaps.LatLngBounds();
			for (const latlng of path) bounds.extend(latlng);
			map.setBounds(bounds);

			// CP 마커
			for (const poi of routeData.points_of_interest) {
				const pos = new kakaoMaps.LatLng(poi.lat, poi.lng);
				const marker = new kakaoMaps.Marker({ map, position: pos, title: poi.name });

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
					if (openInfoWindowRef.current) openInfoWindowRef.current.close();
					infoWindow.open(map, marker);
					openInfoWindowRef.current = infoWindow;
				});
			}

			// START / FINISH 마커
			const firstPos = new kakaoMaps.LatLng(firstPoint.y, firstPoint.x);
			const lastPoint = sampled[sampled.length - 1];
			const lastPos = new kakaoMaps.LatLng(lastPoint.y, lastPoint.x);
			new kakaoMaps.Marker({ map, position: firstPos, title: "START" });
			new kakaoMaps.Marker({ map, position: lastPos, title: "FINISH" });
		},
		[],
	);

	const handleScriptLoad = useCallback(() => {
		if (!window.kakao?.maps?.load || !route) return;
		window.kakao.maps.load(() => {
			if (!window.kakao?.maps) return;
			drawRoute(window.kakao.maps, route);
		});
	}, [drawRoute, route]);

	// route가 나중에 전달될 수 있으므로 kakao가 이미 로드된 경우 처리
	const containerCallbackRef = useCallback(
		(node: HTMLDivElement | null) => {
			(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
			if (!node || !route) return;
			// kakao가 이미 로드되어 있으면 바로 그리기
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
