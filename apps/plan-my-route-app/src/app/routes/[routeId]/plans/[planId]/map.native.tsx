import { NaverMapPathOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchPlanDetail, type PlanDetail, type TrackPoint } from '@/features/api/plan-my-route';
import { getApiOrigin, getStoredAccessToken } from '@/features/auth/session';

type MapCoordinate = {
	latitude: number;
	longitude: number;
};

type MapCamera = {
	latitude: number;
	longitude: number;
	zoom: number;
};

const FALLBACK_CAMERA: MapCamera = {
	latitude: 37.5665,
	longitude: 126.978,
	zoom: 12,
};

export default function PlanMapScreen() {
	const router = useRouter();
	const { planId } = useLocalSearchParams<{ planId: string }>();
	const apiOrigin = useMemo(getApiOrigin, []);

	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [detail, setDetail] = useState<PlanDetail | null>(null);
	const [retryNonce, setRetryNonce] = useState(0);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			if (!planId) {
				setErrorMessage('planId가 필요합니다.');
				setIsLoading(false);
				return;
			}
			setErrorMessage(null);
			setIsLoading(true);
			try {
				const accessToken = await getStoredAccessToken();
				if (!accessToken) {
					if (isMounted) setIsLoading(false);
					router.replace('/login');
					return;
				}
				if (!apiOrigin) throw new Error('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');

				const data = await fetchPlanDetail(apiOrigin, accessToken, planId);
				if (!isMounted) return;
				setDetail(data);
			} catch (error: unknown) {
				if (!isMounted) return;
				setDetail(null);
				setErrorMessage(error instanceof Error ? error.message : '맵을 불러오지 못했습니다.');
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [apiOrigin, planId, router, retryNonce]);

	const validTrack = useMemo(
		() => (detail ? toMapCoordinates(detail.trackPoints) : []),
		[detail],
	);

	if (isLoading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator />
			</ThemedView>
		);
	}

	if (errorMessage) {
		return (
			<ThemedView style={styles.messageContainer}>
				<SafeAreaView style={styles.messageInner}>
					<ThemedText type="default" style={styles.errorText}>
						{errorMessage}
					</ThemedText>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="다시 시도"
						style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
						onPress={() => setRetryNonce((n) => n + 1)}>
						<ThemedText type="smallBold">다시 시도</ThemedText>
					</Pressable>
				</SafeAreaView>
			</ThemedView>
		);
	}

	if (!detail || validTrack.length === 0) {
		return (
			<ThemedView style={styles.messageContainer}>
				<SafeAreaView style={styles.messageInner}>
					<ThemedText type="default">표시할 트랙이 없습니다.</ThemedText>
				</SafeAreaView>
			</ThemedView>
		);
	}

	const initialCamera = getInitialCamera(validTrack);

	return (
		<View style={styles.root}>
			<NaverMapView style={styles.map} initialCamera={initialCamera}>
				<NaverMapPathOverlay
					coords={validTrack}
					width={4}
					color="#2D7EF7"
					outlineWidth={1}
					outlineColor="#174AA0"
				/>
			</NaverMapView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	messageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	messageInner: {
		gap: 12,
		alignItems: 'center',
	},
	errorText: {
		color: '#D64545',
		textAlign: 'center',
	},
	retryButton: {
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: '#A0A4AE',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	pressed: {
		opacity: 0.75,
	},
});

function toMapCoordinates(trackPoints: TrackPoint[]): MapCoordinate[] {
	return trackPoints
		.filter(
			(point) =>
				Number.isFinite(point.x) &&
				Number.isFinite(point.y) &&
				point.y >= -90 &&
				point.y <= 90 &&
				point.x >= -180 &&
				point.x <= 180 &&
				!(point.x === 0 && point.y === 0),
		)
		.map((point) => ({ latitude: point.y, longitude: point.x }));
}

function getInitialCamera(coordinates: MapCoordinate[]): MapCamera {
	if (coordinates.length === 0) return FALLBACK_CAMERA;

	const bounds = coordinates.reduce(
		(acc, c) => ({
			minLat: Math.min(acc.minLat, c.latitude),
			maxLat: Math.max(acc.maxLat, c.latitude),
			minLng: Math.min(acc.minLng, c.longitude),
			maxLng: Math.max(acc.maxLng, c.longitude),
		}),
		{
			minLat: coordinates[0].latitude,
			maxLat: coordinates[0].latitude,
			minLng: coordinates[0].longitude,
			maxLng: coordinates[0].longitude,
		},
	);

	const latitudeDelta = Math.max(bounds.maxLat - bounds.minLat, 0.001);
	const longitudeDelta = Math.max(bounds.maxLng - bounds.minLng, 0.001);
	const maxDelta = Math.max(latitudeDelta, longitudeDelta);

	return {
		latitude: (bounds.minLat + bounds.maxLat) / 2,
		longitude: (bounds.minLng + bounds.maxLng) / 2,
		zoom: getZoomFromDelta(maxDelta),
	};
}

function getZoomFromDelta(delta: number): number {
	if (delta > 5) return 5;
	if (delta > 2) return 7;
	if (delta > 1) return 8;
	if (delta > 0.5) return 9;
	if (delta > 0.2) return 10;
	if (delta > 0.08) return 11;
	if (delta > 0.03) return 12;
	return 13;
}
