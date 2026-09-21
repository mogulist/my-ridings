import {
	NaverMapMarkerOverlay,
	NaverMapPathOverlay,
	NaverMapView,
	type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppIcon } from "@/components/ui/icon";
import { Radius, Shadow, Spacing, STAGE_STROKE_COLORS } from "@/constants/theme";
import {
	type CpMarkerOnRoute,
	fetchPlanDetail,
	type MobilePlanStageRow,
	type PlanDetail,
	type PlanPoiRow,
	type SummitMarkerOnRoute,
	type TrackPoint,
} from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { useTheme } from "@/hooks/use-theme";

const UNPLANNED_STROKE_COLOR = "#9CA3AF";

function stageStrokeColor(dayNumber: number): string {
	if (!Number.isFinite(dayNumber) || dayNumber < 1) return UNPLANNED_STROKE_COLOR;
	return STAGE_STROKE_COLORS[(dayNumber - 1) % STAGE_STROKE_COLORS.length];
}

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
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const mapRef = useRef<NaverMapViewRef>(null);
	const { planId } = useLocalSearchParams<{ planId: string }>();
	const apiOrigin = useMemo(getApiOrigin, []);

	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [detail, setDetail] = useState<PlanDetail | null>(null);
	const [retryNonce, setRetryNonce] = useState(0);
	const [isLocating, setIsLocating] = useState(false);
	const [selectedPoi, setSelectedPoi] = useState<PlanPoiRow | null>(null);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			if (!planId) {
				setErrorMessage("planId가 필요합니다.");
				setIsLoading(false);
				return;
			}
			setErrorMessage(null);
			setIsLoading(true);
			try {
				const accessToken = await getStoredAccessToken();
				if (!accessToken) {
					if (isMounted) setIsLoading(false);
					router.replace("/login");
					return;
				}
				if (!apiOrigin) throw new Error("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");

				const data = await fetchPlanDetail(apiOrigin, accessToken, planId);
				if (!isMounted) return;
				setDetail(data);
			} catch (error: unknown) {
				if (!isMounted) return;
				setDetail(null);
				setErrorMessage(error instanceof Error ? error.message : "맵을 불러오지 못했습니다.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [apiOrigin, planId, router, retryNonce]);

	const validTrack = useMemo(() => (detail ? toMapCoordinates(detail.trackPoints) : []), [detail]);
	const stageSegments = useMemo(
		() => (detail ? buildStageSegments(detail.stages, detail.trackPoints) : []),
		[detail],
	);

	const handleMyLocation = async () => {
		setIsLocating(true);
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") return;
			const pos = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});
			mapRef.current?.animateCameraTo({
				latitude: pos.coords.latitude,
				longitude: pos.coords.longitude,
				zoom: 14,
				duration: 400,
			});
		} finally {
			setIsLocating(false);
		}
	};

	if (isLoading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator color={theme.tint} />
			</ThemedView>
		);
	}

	if (errorMessage) {
		return (
			<ThemedView style={styles.messageContainer}>
				<SafeAreaView style={styles.messageInner}>
					<ThemedText type="default" style={{ color: theme.danger }}>
						{errorMessage}
					</ThemedText>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="다시 시도"
						style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
						onPress={() => setRetryNonce((n) => n + 1)}
					>
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
	const useGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

	return (
		<View style={styles.root}>
			<NaverMapView
				ref={mapRef}
				style={styles.map}
				initialCamera={initialCamera}
				onTapMap={() => setSelectedPoi(null)}
			>
				{stageSegments.length > 0 ? (
					stageSegments.map((seg) => (
						<Fragment key={`stage-${seg.dayNumber}`}>
							<NaverMapPathOverlay
								coords={seg.coords}
								width={9}
								color="#FFFFFF"
								outlineWidth={0}
								zIndex={1}
							/>
							<NaverMapPathOverlay
								coords={seg.coords}
								width={5}
								color={seg.color}
								outlineWidth={0}
								zIndex={2}
							/>
						</Fragment>
					))
				) : (
					<>
						<NaverMapPathOverlay
							coords={validTrack}
							width={8}
							color="#FFFFFF"
							outlineWidth={0}
							zIndex={1}
						/>
						<NaverMapPathOverlay
							coords={validTrack}
							width={5}
							color="#2D7EF7"
							outlineWidth={0}
							zIndex={2}
						/>
					</>
				)}

				{detail.planPois.map((poi, i) => (
					<NaverMapMarkerOverlay
						key={`poi-${poi.id}`}
						latitude={poi.lat}
						longitude={poi.lng}
						width={22}
						height={22}
						image={{ symbol: poi.poi_type === "accommodation" ? "yellow" : "blue" }}
						caption={{ text: poi.name?.trim() || "POI", textSize: 11 }}
						zIndex={10 + i}
						onTap={() => setSelectedPoi(poi)}
					/>
				))}

				{renderCpMarkers(detail.cpMarkers, detail.trackPoints)}
				{renderSummitMarkers(detail.summitMarkers, detail.trackPoints)}
			</NaverMapView>

			<View
				pointerEvents="box-none"
				style={[styles.legendAnchor, { top: insets.top + Spacing.two, left: Spacing.three }]}
			>
				{useGlass ? (
					<GlassView glassEffectStyle="regular" isInteractive style={styles.legendChrome}>
						<StageLegend stages={detail.stages} />
					</GlassView>
				) : (
					<View
						style={[
							styles.legendChrome,
							{
								backgroundColor: theme.surfaceElevated,
								boxShadow: Shadow.floating,
							},
						]}
					>
						<StageLegend stages={detail.stages} />
					</View>
				)}
			</View>

			{selectedPoi ? (
				<View
					style={[
						styles.poiCard,
						{
							bottom: insets.bottom + 88,
							backgroundColor: theme.surfaceElevated,
							boxShadow: Shadow.floating,
						},
					]}
				>
					<View style={styles.poiCardHeader}>
						<View style={styles.poiCardTitle}>
							<ThemedText type="headline" numberOfLines={2} selectable>
								{selectedPoi.name}
							</ThemedText>
							<ThemedText type="caption" themeColor="textSecondary" selectable>
								{selectedPoi.poi_type === "accommodation"
									? accommodationIntentLabel(selectedPoi.intent)
									: "경유지"}
							</ThemedText>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="장소 정보 닫기"
							style={styles.poiCardClose}
							onPress={() => setSelectedPoi(null)}
						>
							<AppIcon name="xmark" size={16} tintColor={theme.textSecondary} />
						</Pressable>
					</View>
					{selectedPoi.address_name ? (
						<ThemedText type="caption" themeColor="textSecondary" numberOfLines={2} selectable>
							{selectedPoi.address_name}
						</ThemedText>
					) : null}
					{selectedPoi.memo?.trim() ? (
						<ThemedText type="small" numberOfLines={2} selectable>
							{selectedPoi.memo.trim()}
						</ThemedText>
					) : null}
					<MapPoiActions poi={selectedPoi} />
				</View>
			) : null}

			<View
				style={[
					styles.fabAnchor,
					{
						bottom: insets.bottom + (selectedPoi ? 286 : 88),
						right: Spacing.three,
					},
				]}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="현재 위치로 이동"
					disabled={isLocating}
					style={({ pressed }) => [
						styles.fab,
						{
							backgroundColor: theme.tint,
							boxShadow: Shadow.floating,
							opacity: pressed ? 0.9 : isLocating ? 0.7 : 1,
						},
					]}
					onPress={() => {
						void handleMyLocation();
					}}
				>
					{isLocating ? (
						<ActivityIndicator color="#fff" />
					) : (
						<AppIcon name="location.fill" size={26} tintColor="#FFFFFF" />
					)}
				</Pressable>
			</View>
		</View>
	);
}

function MapPoiActions({ poi }: { poi: PlanPoiRow }) {
	const theme = useTheme();
	const actions: { key: string; label: string; icon: string; url: string }[] = [];
	if (poi.phone) {
		actions.push({ key: "phone", label: "전화", icon: "phone.fill", url: `tel:${poi.phone}` });
	}
	const naverUrl = safeWebUrl(poi.naver_place_url);
	if (naverUrl) {
		actions.push({ key: "naver", label: "네이버 지도", icon: "map.fill", url: naverUrl });
	}
	const bookingUrl = safeWebUrl(poi.booking_url);
	if (bookingUrl) {
		actions.push({ key: "booking", label: "예약", icon: "safari.fill", url: bookingUrl });
	}

	if (actions.length === 0) {
		return (
			<ThemedText type="caption" themeColor="textSecondary" selectable>
				등록된 빠른 실행 정보가 없습니다.
			</ThemedText>
		);
	}

	return (
		<View style={styles.poiActions}>
			{actions.map((action) => (
				<Pressable
					key={action.key}
					accessibilityRole="link"
					accessibilityLabel={`${poi.name} ${action.label}`}
					style={({ pressed }) => [
						styles.poiAction,
						{ borderColor: `${theme.tint}40` },
						pressed && styles.pressed,
					]}
					onPress={() => void Linking.openURL(action.url)}
				>
					<AppIcon name={action.icon} size={16} tintColor={theme.tint} />
					<ThemedText type="caption" style={{ color: theme.tint }}>
						{action.label}
					</ThemedText>
				</Pressable>
			))}
		</View>
	);
}

function safeWebUrl(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
	} catch {
		return null;
	}
}

function accommodationIntentLabel(intent: PlanPoiRow["intent"]): string {
	if (intent === "confirmed") return "숙소 · 확정";
	if (intent === "planned") return "숙소 · 선택";
	return "숙소 · 후보";
}

function StageLegend({ stages }: { stages: MobilePlanStageRow[] }) {
	return (
		<View style={styles.legendInner}>
			{stages.map((_, index) => {
				const dayNumber = index + 1;
				const color = stageStrokeColor(dayNumber);
				return (
					<View key={`leg-${dayNumber}`} style={styles.legendRow}>
						<View style={[styles.legendDot, { backgroundColor: color }]} />
						<ThemedText type="small" numberOfLines={1}>
							D{dayNumber}
						</ThemedText>
					</View>
				);
			})}
		</View>
	);
}

function renderCpMarkers(cpMarkers: CpMarkerOnRoute[], trackPoints: TrackPoint[]) {
	return cpMarkers
		.map((cp) => {
			const tp = trackPoints[cp.trackPointIndex];
			if (!tp || !Number.isFinite(tp.x) || !Number.isFinite(tp.y)) return null;
			return (
				<NaverMapMarkerOverlay
					key={`cp-${cp.id}`}
					latitude={tp.y}
					longitude={tp.x}
					width={24}
					height={24}
					image={{ symbol: "gray" }}
					caption={{ text: cp.name?.trim() || "CP", textSize: 10 }}
				/>
			);
		})
		.filter(Boolean);
}

function renderSummitMarkers(summitMarkers: SummitMarkerOnRoute[], trackPoints: TrackPoint[]) {
	return summitMarkers
		.map((s) => {
			const tp = trackPoints[s.trackPointIndex];
			if (!tp || !Number.isFinite(tp.x) || !Number.isFinite(tp.y)) return null;
			return (
				<NaverMapMarkerOverlay
					key={`summit-${s.id}-${s.passIndex}`}
					latitude={tp.y}
					longitude={tp.x}
					width={24}
					height={24}
					image={{ symbol: "red" }}
					caption={{ text: s.name?.trim() || "정상", textSize: 10 }}
				/>
			);
		})
		.filter(Boolean);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	legendAnchor: {
		position: "absolute",
		zIndex: 20,
	},
	legendChrome: {
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		overflow: "hidden",
	},
	legendInner: {
		gap: Spacing.one,
	},
	legendRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.two,
	},
	legendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	fabAnchor: {
		position: "absolute",
		zIndex: 20,
	},
	fab: {
		width: 56,
		height: 56,
		borderRadius: Radius.pill,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	poiCard: {
		position: "absolute",
		left: Spacing.three,
		right: Spacing.three,
		zIndex: 30,
		borderRadius: Radius.lg,
		borderCurve: "continuous",
		padding: Spacing.three,
		gap: Spacing.two,
	},
	poiCardHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.two,
	},
	poiCardTitle: {
		flex: 1,
		minWidth: 0,
		gap: Spacing.half,
	},
	poiCardClose: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
	},
	poiActions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.two,
	},
	poiAction: {
		minHeight: 40,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.three,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.one,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	messageContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	messageInner: {
		gap: 12,
		alignItems: "center",
	},
	retryButton: {
		alignSelf: "center",
		borderWidth: 1,
		borderColor: "#A0A4AE",
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	pressed: {
		opacity: 0.75,
	},
});

type StageSegment = {
	dayNumber: number;
	color: string;
	coords: MapCoordinate[];
};

function buildStageSegments(
	stages: MobilePlanStageRow[],
	trackPoints: TrackPoint[],
): StageSegment[] {
	if (stages.length === 0 || trackPoints.length === 0) return [];

	return stages
		.map((stage, index) => {
			const dayNumber = index + 1;
			const startM = Number(stage.start_distance);
			const endM = Number(stage.end_distance);
			if (!Number.isFinite(startM) || !Number.isFinite(endM) || endM <= startM) return null;

			const segmentPoints = trackPoints.filter(
				(p) => p.d != null && (p.d as number) >= startM && (p.d as number) <= endM,
			);
			const coords = toMapCoordinates(segmentPoints);
			if (coords.length < 2) return null;

			return {
				dayNumber,
				color: stageStrokeColor(dayNumber),
				coords,
			};
		})
		.filter((s): s is StageSegment => s != null);
}

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
