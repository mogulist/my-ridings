import { snapLatLngToTrack } from '@my-ridings/plan-geometry';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import type { TrackPoint } from '@/features/api/plan-my-route';

/** 권한/구독 상태 플래그 */
export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied';

export type CurrentLocationKmState = {
	permission: LocationPermissionStatus;
	/** 가장 최근 GPS 좌표 (트랙 스냅 전 원본) */
	lat: number | null;
	lng: number | null;
	/** 트랙에 스냅된 현재 km (경로 누적거리 기준) */
	currentKm: number | null;
	error: string | null;
};

/**
 * expo-location `watchPositionAsync` 구독 + 트랙 스냅으로 현재 km 도출.
 * `isActive`가 false면 구독하지 않는다 (화면 비활성 / 트랙 미로드 시).
 *
 * 배터리 보수: `Balanced`, 50m 이동마다만 갱신.
 */
export function useCurrentLocationKm(
	trackPoints: TrackPoint[] | null | undefined,
	isActive: boolean,
): CurrentLocationKmState {
	const [permission, setPermission] = useState<LocationPermissionStatus>('unknown');
	const [lat, setLat] = useState<number | null>(null);
	const [lng, setLng] = useState<number | null>(null);
	const [currentKm, setCurrentKm] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const trackPointsRef = useRef<TrackPoint[] | null>(null);
	trackPointsRef.current = trackPoints ?? null;

	useEffect(() => {
		if (!isActive) return;

		let isMounted = true;
		let sub: Location.LocationSubscription | null = null;

		void (async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (!isMounted) return;
				if (status !== 'granted') {
					setPermission('denied');
					return;
				}
				setPermission('granted');

				sub = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.Balanced,
						distanceInterval: 50,
					},
					(loc) => {
						if (!isMounted) return;
						const nextLat = loc.coords.latitude;
						const nextLng = loc.coords.longitude;
						setLat(nextLat);
						setLng(nextLng);
						const track = trackPointsRef.current;
						if (track && track.length > 0) {
							const snapped = snapLatLngToTrack(track, nextLat, nextLng);
							setCurrentKm(snapped ? snapped.distanceKm : null);
						}
					},
				);
			} catch (e: unknown) {
				if (!isMounted) return;
				setError(e instanceof Error ? e.message : '위치를 가져오지 못했습니다.');
			}
		})();

		return () => {
			isMounted = false;
			if (sub) sub.remove();
		};
	}, [isActive]);

	return { permission, lat, lng, currentKm, error };
}
