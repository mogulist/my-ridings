import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { MapFeasibilityScreen } from "./src/screens/MapFeasibilityScreen";

type ExpoExtra = {
	kakaoNativeAppKey?: string;
};

const getKakaoNativeAppKey = (): string => {
	const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
	const fromExtra = extra?.kakaoNativeAppKey;
	return typeof fromExtra === "string" ? fromExtra : "";
};

export default function App() {
	const nativeAppKey = getKakaoNativeAppKey();

	if (!nativeAppKey) {
		return (
			<View style={styles.centered}>
				<Text style={styles.title}>KAKAO_NATIVE_APP_KEY 없음</Text>
				<Text style={styles.body}>
					프로젝트 루트 또는 앱 디렉터리에 `.env`를 두고 `KAKAO_NATIVE_APP_KEY`를 설정한 뒤 `npx
					expo prebuild --platform ios` 및 `npx expo run:ios`를 실행하세요. 자세한 내용은 README를
					참고하세요.
				</Text>
				<StatusBar style="auto" />
			</View>
		);
	}

	return (
		<View style={styles.fill}>
			<MapFeasibilityScreen nativeAppKey={nativeAppKey} />
			<StatusBar style="light" />
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {
		flex: 1,
	},
	centered: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 8,
	},
	body: {
		fontSize: 14,
		color: "#444",
		textAlign: "center",
	},
});
