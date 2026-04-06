import { KakaoMap, KakaoMapView } from "@react-native-kakao/map";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MapFeasibilityScreenProps = {
	nativeAppKey: string;
};

type MapCamera = {
	lat: number;
	lng: number;
	zoomLevel: number;
};

const INITIAL_CAMERA: MapCamera = {
	lat: 37.5665,
	lng: 126.978,
	zoomLevel: 15,
};

export const MapFeasibilityScreen = ({ nativeAppKey }: MapFeasibilityScreenProps) => {
	const [isSdkReady, setIsSdkReady] = useState(false);
	const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
	const [camera, setCamera] = useState<MapCamera>(INITIAL_CAMERA);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				await KakaoMap.initializeKakaoMapSDK(nativeAppKey);
				if (!cancelled) setIsSdkReady(true);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (!cancelled) setInitErrorMessage(message);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [nativeAppKey]);

	const handleZoomIn = useCallback(() => {
		setCamera((previous) => ({
			...previous,
			zoomLevel: Math.min(previous.zoomLevel + 1, 22),
		}));
	}, []);

	const handleZoomOut = useCallback(() => {
		setCamera((previous) => ({
			...previous,
			zoomLevel: Math.max(previous.zoomLevel - 1, 1),
		}));
	}, []);

	if (initErrorMessage) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorTitle}>Kakao Map SDK 초기화 실패</Text>
				<Text style={styles.errorBody}>{initErrorMessage}</Text>
			</View>
		);
	}

	if (!isSdkReady) {
		return (
			<View style={styles.centered}>
				<Text>Kakao Map SDK 초기화 중…</Text>
			</View>
		);
	}

	return (
		<View style={styles.fill}>
			<KakaoMapView style={styles.map} camera={camera} cameraAnimationDuration={200} />
			<View style={styles.overlay} pointerEvents="box-none">
				<Text style={styles.hint}>
					Feasibility: 버튼으로 zoomLevel 변경. @react-native-kakao/map 2.2.7은 JS에서
					polyline/커스텀 marker API를 노출하지 않음(README PASS·FAIL 표 참고).
				</Text>
				<View style={styles.row}>
					<Pressable style={styles.button} onPress={handleZoomOut}>
						<Text style={styles.buttonLabel}>Zoom −</Text>
					</Pressable>
					<Pressable style={styles.button} onPress={handleZoomIn}>
						<Text style={styles.buttonLabel}>Zoom +</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	fill: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	centered: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
		backgroundColor: "#fff",
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 8,
	},
	errorBody: {
		fontSize: 14,
		color: "#444",
		textAlign: "center",
	},
	overlay: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		padding: 16,
		paddingBottom: 32,
		backgroundColor: "rgba(255,255,255,0.92)",
	},
	hint: {
		fontSize: 12,
		color: "#333",
		marginBottom: 12,
	},
	row: {
		flexDirection: "row",
		gap: 12,
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		backgroundColor: "#111",
		alignItems: "center",
	},
	buttonLabel: {
		color: "#fff",
		fontWeight: "600",
	},
});
