import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import type { TrackPoint } from "@/features/api/plan-my-route";
import { locateRide } from "@/features/live-activity/ride-supply-data";
import { updateRideLocation } from "@/features/live-activity/ride-tracking";

export type LocationPermissionStatus = "unknown" | "granted" | "denied";

export type CurrentLocationKmState = {
	permission: LocationPermissionStatus;
	lat: number | null;
	lng: number | null;
	/** 트랙에 스냅된 경로 누적 km */
	currentKm: number | null;
	error: string | null;
	isRefreshing: boolean;
	isWatching: boolean;
	/** 트랙 샘플이 없으면 no-op */
	canRefresh: boolean;
	refresh: () => Promise<void>;
};

/**
 * 스테이지 화면을 보는 동안 위치를 자동 갱신하고, 필요하면 수동으로 즉시 갱신한다.
 */
export function useCurrentLocationKm(
	trackPoints: TrackPoint[] | null | undefined,
): CurrentLocationKmState {
	const [permission, setPermission] = useState<LocationPermissionStatus>("unknown");
	const [lat, setLat] = useState<number | null>(null);
	const [lng, setLng] = useState<number | null>(null);
	const [currentKm, setCurrentKm] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isWatching, setIsWatching] = useState(false);

	const t = trackPoints ?? [];
	const canRefresh = t.length > 0;
	const applyLocation = useCallback(
		(loc: Location.LocationObject) => {
			const track = trackPoints ?? [];
			if (track.length === 0) return;

			const nextLat = loc.coords.latitude;
			const nextLng = loc.coords.longitude;
			setLat(nextLat);
			setLng(nextLng);
			const fix = { ...loc.coords, timestamp: loc.timestamp };
			const result = locateRide(track, fix, null);
			setCurrentKm(result.position?.km ?? null);
			setError(result.reason);
			void updateRideLocation(fix).catch(() => {});
		},
		[trackPoints],
	);

	const refresh = useCallback(async () => {
		const track = trackPoints ?? [];
		if (track.length === 0) {
			setError("트랙 데이터가 없어 위치를 표시할 수 없습니다.");
			return;
		}
		setError(null);
		setIsRefreshing(true);
		try {
			const existing = await Location.getForegroundPermissionsAsync();
			const { status } =
				existing.status === "undetermined"
					? await Location.requestForegroundPermissionsAsync()
					: existing;
			if (status !== "granted") {
				setPermission("denied");
				setError("위치 권한이 필요합니다.");
				return;
			}
			setPermission("granted");

			const loc = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});
			applyLocation(loc);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "위치를 가져오지 못했습니다.");
		} finally {
			setIsRefreshing(false);
		}
	}, [applyLocation, trackPoints]);

	useEffect(() => {
		if (!canRefresh || Platform.OS === "web") return;

		let cancelled = false;
		let subscription: Location.LocationSubscription | null = null;

		void (async () => {
			try {
				const existing = await Location.getForegroundPermissionsAsync();
				const { status } =
					existing.status === "undetermined"
						? await Location.requestForegroundPermissionsAsync()
						: existing;
				if (cancelled) return;
				if (status !== "granted") {
					setPermission("denied");
					return;
				}

				setPermission("granted");
				subscription = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.Balanced,
						distanceInterval: 50,
						timeInterval: 30_000,
					},
					(location) => {
						setError(null);
						applyLocation(location);
					},
				);
				if (cancelled) {
					subscription.remove();
					return;
				}
				setIsWatching(true);
			} catch (e: unknown) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "위치 자동 갱신을 시작하지 못했습니다.");
				}
			}
		})();

		return () => {
			cancelled = true;
			subscription?.remove();
			setIsWatching(false);
		};
	}, [applyLocation, canRefresh]);

	return {
		permission,
		lat,
		lng,
		currentKm,
		error,
		isRefreshing,
		isWatching,
		canRefresh,
		refresh,
	};
}
