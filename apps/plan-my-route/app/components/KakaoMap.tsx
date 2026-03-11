"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

// ── RideWithGPS 타입 ──────────────────────────────────────────────
interface TrackPoint {
	x: number; // 경도
	y: number; // 위도
	e?: number; // 고도
	d?: number; // 누적 거리
}

interface PointOfInterest {
	id: number;
	name: string;
	lat: number;
	lng: number;
	poi_type_name: string;
}

interface RideWithGPSRoute {
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
	) => KakaoMap;
	LatLng: new (lat: number, lng: number) => unknown;
	LatLngBounds: new () => KakaoLatLngBounds;
	Polyline: new (options: {
		map: KakaoMap;
		path: unknown[];
		strokeWeight?: number;
		strokeColor?: string;
		strokeOpacity?: number;
		strokeStyle?: string;
	}) => void;
	Marker: new (options: { map: KakaoMap; position: unknown; title?: string }) => KakaoMarker;
	InfoWindow: new (options: { content: string; removable?: boolean }) => KakaoInfoWindow;
	event: {
		addListener: (target: unknown, event: string, callback: () => void) => void;
	};
}

interface KakaoMap {
	setBounds: (bounds: unknown) => void;
}

interface KakaoLatLngBounds {
	extend: (latlng: unknown) => void;
}

interface KakaoMarker {
	getPosition: () => unknown;
}

interface KakaoInfoWindow {
	open: (map: KakaoMap, marker: KakaoMarker) => void;
	close: () => void;
}

// ── 상수 ─────────────────────────────────────────────────────────
const RWGPS_ROUTE_URL = "https://ridewithgps.com/routes/52263710";
const ROUTE_ID = "52263710";

// track_points 개수가 너무 많으므로 적절히 샘플링
function samplePoints(points: TrackPoint[], maxPoints = 3000): TrackPoint[] {
	if (points.length <= maxPoints) return points;
	const step = Math.ceil(points.length / maxPoints);
	return points.filter((_, i) => i % step === 0);
}

function formatDistance(meters: number): string {
	return (meters / 1000).toFixed(1) + " km";
}

function formatElevation(meters: number): string {
	return meters.toFixed(0) + " m";
}

// ── 컴포넌트 ─────────────────────────────────────────────────────
export default function KakaoMap() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loading, setLoading] = useState(false);
	const [routeInfo, setRouteInfo] = useState<{
		name: string;
		distance: number;
		elevation_gain: number;
		elevation_loss: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const mapRef = useRef<KakaoMap | null>(null);
	const openInfoWindowRef = useRef<KakaoInfoWindow | null>(null);

	const drawRoute = useCallback(async (kakaoMaps: KakaoMapsAPI) => {
		if (!containerRef.current) return;

		setLoading(true);
		setError(null);

		try {
			// 1. API 프록시를 통해 경로 데이터 가져오기
			const res = await fetch(`/api/ridewithgps?routeId=${ROUTE_ID}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const route: RideWithGPSRoute = await res.json();

			setRouteInfo({
				name: route.name,
				distance: route.distance,
				elevation_gain: route.elevation_gain,
				elevation_loss: route.elevation_loss,
			});

			// 2. track_points 샘플링 (성능 최적화)
			const sampled = samplePoints(route.track_points);

			// 3. 지도 초기화
			const firstPoint = sampled[0];
			const map = new kakaoMaps.Map(containerRef.current, {
				center: new kakaoMaps.LatLng(firstPoint.y, firstPoint.x),
				level: 12,
			});
			mapRef.current = map;

			// 4. Polyline 그리기
			const path = sampled.map((p) => new kakaoMaps.LatLng(p.y, p.x));
			new kakaoMaps.Polyline({
				map,
				path,
				strokeWeight: 4,
				strokeColor: "#FF4500",
				strokeOpacity: 0.85,
				strokeStyle: "solid",
			});

			// 5. 지도 범위를 경로에 맞게 자동 조정
			const bounds = new kakaoMaps.LatLngBounds();
			for (const latlng of path) bounds.extend(latlng);
			map.setBounds(bounds);

			// 6. CP(컨트롤 포인트) 마커 표시
			for (const poi of route.points_of_interest) {
				const pos = new kakaoMaps.LatLng(poi.lat, poi.lng);
				const marker = new kakaoMaps.Marker({
					map,
					position: pos,
					title: poi.name,
				});

				// CP 이름이 담긴 인포윈도우
				const infoContent = `
					<div style="
						padding:8px 12px;
						font-size:13px;
						font-weight:600;
						color:#1a1a1a;
						background:#fff;
						border-radius:6px;
						box-shadow:0 2px 8px rgba(0,0,0,0.15);
						max-width:180px;
						line-height:1.4;
					">
						📍 ${poi.name}
					</div>`;
				const infoWindow = new kakaoMaps.InfoWindow({ content: infoContent, removable: true });

				kakaoMaps.event.addListener(marker, "click", () => {
					if (openInfoWindowRef.current) openInfoWindowRef.current.close();
					infoWindow.open(map, marker);
					openInfoWindowRef.current = infoWindow;
				});
			}

			// 7. 출발지/도착지 마커
			const startPos = new kakaoMaps.LatLng(firstPoint.y, firstPoint.x);
			const lastPoint = sampled[sampled.length - 1];
			const endPos = new kakaoMaps.LatLng(lastPoint.y, lastPoint.x);

			const makeIconMarker = (pos: unknown, label: string) => {
				const content = `
					<div style="
						padding:4px 8px;
						font-size:12px;
						font-weight:700;
						color:#fff;
						background:${label === "START" ? "#16a34a" : "#dc2626"};
						border-radius:4px;
						white-space:nowrap;
					">${label}</div>`;
				return new kakaoMaps.Marker({ map, position: pos, title: label });
			};
			makeIconMarker(startPos, "START");
			makeIconMarker(endPos, "FINISH");

		} catch (err) {
			console.error("Route load failed:", err);
			setError("경로 데이터를 불러오지 못했습니다.");
		} finally {
			setLoading(false);
		}
	}, []);

	const handleScriptLoad = useCallback(() => {
		if (!window.kakao?.maps?.load) return;
		window.kakao.maps.load(() => {
			if (!window.kakao?.maps) return;
			drawRoute(window.kakao.maps);
		});
	}, [drawRoute]);

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

			{/* 지도 컨테이너 */}
			<div ref={containerRef} className="h-full w-full" />

			{/* 로딩 오버레이 */}
			{loading && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60">
					<div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-zinc-800">
						<svg
							className="h-5 w-5 animate-spin text-orange-500"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
						<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
							경로 불러오는 중…
						</span>
					</div>
				</div>
			)}

			{/* 에러 메시지 */}
			{error && (
				<div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-50 px-4 py-3 shadow-lg border border-red-200">
					<p className="text-sm text-red-700">{error}</p>
				</div>
			)}

			{/* 경로 정보 칩 (로드 완료 후) */}
			{routeInfo && !loading && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur dark:bg-zinc-800/90">
					<a
						href={RWGPS_ROUTE_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs font-semibold text-orange-600 hover:underline"
					>
						🔗 RideWithGPS
					</a>
					<span className="text-xs text-zinc-400">|</span>
					<span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
						{formatDistance(routeInfo.distance)}
					</span>
					<span className="text-xs text-zinc-400">|</span>
					<span className="text-xs text-green-600">↑{formatElevation(routeInfo.elevation_gain)}</span>
					<span className="text-xs text-red-500">↓{formatElevation(routeInfo.elevation_loss)}</span>
				</div>
			)}
		</div>
	);
}
