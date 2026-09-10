import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { fetchRoutes } from "@/features/api/plan-my-route";
import { createSessionFromUrl } from "@/features/auth/oauth";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { SUPABASE } from "@/features/auth/supabase-client";

WebBrowser.maybeCompleteAuthSession();

const GITHUB_ICON_URI_LIGHT = "https://github.githubassets.com/favicons/favicon.png";
const GITHUB_ICON_URI_DARK = "https://cdn.simpleicons.org/github/ffffff";
const redirectTo = Linking.createURL("auth/callback");

export default function LoginScreen() {
	const router = useRouter();
	const colorScheme = useColorScheme();
	const isDark = colorScheme === "dark";
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	const apiOrigin = getApiOrigin();
	const isConfigValid = Boolean(
		process.env.EXPO_PUBLIC_SUPABASE_URL &&
			(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
				process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
			apiOrigin,
	);

	useEffect(() => {
		void (async () => {
			const accessToken = await getStoredAccessToken();
			if (!accessToken) return;
			router.replace("/");
		})();
	}, [router]);

	const handleGithubLogin = async () => {
		if (!isConfigValid) {
			setErrorMessage("Supabase 및 API 환경변수가 필요합니다.");
			return;
		}

		setIsBusy(true);
		setErrorMessage(null);

		try {
			const { data, error } = await SUPABASE.auth.signInWithOAuth({
				provider: "github",
				options: {
					redirectTo,
					skipBrowserRedirect: true,
				},
			});
			if (error) throw error;
			if (!data.url) throw new Error("OAuth URL을 받지 못했습니다.");

			const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
			if (result.type !== "success") return;

			await createSessionFromUrl(result.url);
			const accessToken = await getStoredAccessToken();
			if (!accessToken) throw new Error("세션을 만들지 못했습니다.");

			await fetchRoutes(apiOrigin, accessToken);
			router.replace("/");
		} catch (error: unknown) {
			setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedView style={styles.content}>
					<ThemedText type="title" style={styles.title}>
						Plan My Route
					</ThemedText>
					<ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
						GitHub로 로그인 후 Home에서 내 라우트와 플랜을 확인하세요.
					</ThemedText>

					<Pressable
						onPress={() => void handleGithubLogin()}
						disabled={isBusy || !isConfigValid}
						style={({ pressed }) => [
							styles.oauthButton,
							isDark ? styles.oauthButtonDark : styles.oauthButtonLight,
							pressed && styles.pressed,
							(isBusy || !isConfigValid) && styles.buttonDisabled,
						]}
					>
						<Image
							source={{ uri: isDark ? GITHUB_ICON_URI_DARK : GITHUB_ICON_URI_LIGHT }}
							style={styles.logo}
							contentFit="contain"
						/>
						<Text style={isDark ? styles.oauthLabelDark : styles.oauthLabelLight}>
							{isBusy ? "처리 중..." : "GitHub로 로그인"}
						</Text>
					</Pressable>

					{errorMessage ? (
						<ThemedText type="small" style={styles.errorText}>
							{errorMessage}
						</ThemedText>
					) : null}
				</ThemedView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "center",
	},
	safeArea: {
		flex: 1,
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: Spacing.four,
		gap: Spacing.three,
	},
	title: {
		textAlign: "center",
	},
	subtitle: {
		textAlign: "center",
	},
	oauthButton: {
		borderRadius: 8,
		borderWidth: 1,
		minHeight: 48,
		paddingVertical: 12,
		paddingHorizontal: Spacing.three,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.three,
	},
	oauthButtonLight: {
		backgroundColor: "#FFFFFF",
		borderColor: "#DADCE0",
	},
	oauthButtonDark: {
		backgroundColor: "#000000",
		borderColor: "#3E3E3E",
	},
	oauthLabelLight: {
		color: "#111111",
		fontSize: 15,
		fontWeight: "600",
	},
	oauthLabelDark: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "600",
	},
	logo: {
		width: 18,
		height: 18,
		borderRadius: 3,
	},
	pressed: {
		opacity: 0.85,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	errorText: {
		color: "#D64545",
		textAlign: "center",
	},
});
