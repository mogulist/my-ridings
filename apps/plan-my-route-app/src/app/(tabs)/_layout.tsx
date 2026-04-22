import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";

import AppTabs from "@/components/app-tabs";
import { getStoredAccessToken } from "@/features/auth/session";

export default function TabsLayout() {
	const [isChecking, setIsChecking] = useState(true);
	const [accessToken, setAccessToken] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const token = await getStoredAccessToken();
			if (!isMounted) return;
			setAccessToken(token);
			setIsChecking(false);
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	if (isChecking) return null;
	if (!accessToken) return <Redirect href="/login" />;

	return <AppTabs />;
}
