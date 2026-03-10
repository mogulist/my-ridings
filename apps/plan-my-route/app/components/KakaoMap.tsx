"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const DEFAULT_LEVEL = 10;

declare global {
	interface Window {
		kakao?: {
			maps: {
				load: (callback: () => void) => void;
				Map: new (
					container: HTMLElement,
					options: { center: unknown; level: number }
				) => void;
				LatLng: new (lat: number, lng: number) => unknown;
			};
		};
	}
}

export default function KakaoMap() {
	const containerRef = useRef<HTMLDivElement>(null);

	const handleScriptLoad = useCallback(() => {
		if (!window.kakao?.maps?.load || !containerRef.current) return;
		window.kakao.maps.load(() => {
			if (!containerRef.current || !window.kakao?.maps) return;
			const { Map, LatLng } = window.kakao.maps;
			new Map(containerRef.current, {
				center: new LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
				level: DEFAULT_LEVEL,
			});
		});
	}, []);

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
		<>
			<Script
				src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
				onLoad={handleScriptLoad}
				strategy="afterInteractive"
			/>
			<div ref={containerRef} className="h-full w-full" />
		</>
	);
}
