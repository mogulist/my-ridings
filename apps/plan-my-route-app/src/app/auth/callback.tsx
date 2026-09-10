import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { createSessionFromUrl } from "@/features/auth/oauth";
import * as Linking from "expo-linking";

export default function AuthCallbackScreen() {
	const router = useRouter();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		void (async () => {
			try {
				const initialUrl = await Linking.getInitialURL();
				if (!initialUrl) {
					if (isMounted) router.replace("/login");
					return;
				}

				await createSessionFromUrl(initialUrl);
				if (isMounted) router.replace("/");
			} catch (error: unknown) {
				if (!isMounted) return;
				setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [router]);

	return (
		<ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
			<ThemedText>{errorMessage ?? "로그인 처리 중..."}</ThemedText>
		</ThemedView>
	);
}
