import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
	const nativeAppKey = process.env.KAKAO_NATIVE_APP_KEY ?? "";

	const kakaoPlugin: [string, Record<string, unknown>] | null = nativeAppKey
		? [
				"@react-native-kakao/core",
				{
					nativeAppKey,
					ios: {},
				},
			]
		: null;

	return {
		...config,
		name: "Plan My Route Mobile",
		slug: "plan-my-route-mobile",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/icon.png",
		userInterfaceStyle: "light",
		newArchEnabled: true,
		scheme: nativeAppKey ? `kakao${nativeAppKey}` : "plan-my-route-mobile",
		splash: {
			image: "./assets/splash-icon.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff",
		},
		ios: {
			supportsTablet: true,
			bundleIdentifier: "com.myridings.planmyroute.mobile",
		},
		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			edgeToEdgeEnabled: true,
			predictiveBackGestureEnabled: false,
			package: "com.myridings.planmyroute.mobile",
		},
		web: {
			favicon: "./assets/favicon.png",
		},
		extra: {
			kakaoNativeAppKey: nativeAppKey,
		},
		plugins: ["expo-dev-client", ...(kakaoPlugin ? [kakaoPlugin] : [])],
	};
};
