import { Redirect, type Href } from "expo-router";
import React, { useEffect, useState } from "react";

import AppTabs from "@/components/app-tabs";
import { getStoredAccessToken } from "@/features/auth/session";
import { claimActiveRideRoute } from "@/features/navigation/active-ride";
import { claimLastReviewRoute } from "@/features/navigation/last-review-route";

export default function TabsLayout() {
	const [isChecking, setIsChecking] = useState(true);
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const [resumePath, setResumePath] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const token = await getStoredAccessToken();
			const activeRideRoute = token ? await claimActiveRideRoute() : null;
			const storedReviewRoute = token && !activeRideRoute ? await claimLastReviewRoute() : null;
			if (!isMounted) return;
			setAccessToken(token);
			setResumePath(activeRideRoute ?? storedReviewRoute);
			setIsChecking(false);
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	if (isChecking) return null;
	if (!accessToken) return <Redirect href="/login" />;
	if (resumePath) return <Redirect href={resumePath as Href} />;

	return <AppTabs />;
}
