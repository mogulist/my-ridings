import { snapLatLngToTrack } from '@my-ridings/plan-geometry';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { TrackPoint } from '@/features/api/plan-my-route';

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied';

export type CurrentLocationKmState = {
	permission: LocationPermissionStatus;
	lat: number | null;
	lng: number | null;
	/** 트랙에 스냅된 경로 누적 km (버튼으로 갱신 시에만 채워짐) */
	currentKm: number | null;
	error: string | null;
	isRefreshing: boolean;
	/** 트랙 샘플이 없으면 no-op */
	canRefresh: boolean;
	refresh: () => Promise<void>;
};

/**
 * 연속 추적 없음. 사용자가 호출할 때만 `getCurrentPositionAsync` + 트랙 스냅.
 */
export function useCurrentLocationKm(
	trackPoints: TrackPoint[] | null | undefined,
): CurrentLocationKmState {
	const [permission, setPermission] = useState<LocationPermissionStatus>('unknown');
	const [lat, setLat] = useState<number | null>(null);
	const [lng, setLng] = useState<number | null>(null);
	const [currentKm, setCurrentKm] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const t = trackPoints ?? [];
	const canRefresh = t.length > 0;

	const refresh = useCallback(async () => {
		const track = trackPoints ?? [];
		if (track.length === 0) {
			setError('트랙 데이터가 없어 위치를 표시할 수 없습니다.');
			return;
		}
		setError(null);
		setIsRefreshing(true);
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				setPermission('denied');
				return;
			}
			setPermission('granted');

			const loc = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});
			const nextLat = loc.coords.latitude;
			const nextLng = loc.coords.longitude;
			setLat(nextLat);
			setLng(nextLng);
			const snapped = snapLatLngToTrack(track, nextLat, nextLng);
			setCurrentKm(snapped ? snapped.distanceKm : null);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : '위치를 가져오지 못했습니다.');
		} finally {
			setIsRefreshing(false);
		}
	}, [trackPoints]);

	return {
		permission,
		lat,
		lng,
		currentKm,
		error,
		isRefreshing,
		canRefresh,
		refresh,
	};
}
