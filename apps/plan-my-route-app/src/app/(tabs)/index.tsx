import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import {
	fetchRouteDetail,
	fetchRoutes,
	getFavoritePlans,
	type RouteItem,
} from "@/features/api/plan-my-route";
import { getApiOrigin, getStoredAccessToken } from "@/features/auth/session";
import { seedRouteDetailCache } from "@/features/plan-my-route/route-detail-query";
import { useTheme } from "@/hooks/use-theme";

type FavoritePlanCard = {
	routeId: string;
	routeName: string;
	planId: string;
	planName: string;
};

type FavoriteRow = FavoritePlanCard & { rowKind: "favorite" };
type RouteRow = RouteItem & { rowKind: "route" };
type PlaceholderRow = { rowKind: "loading" } | { rowKind: "empty" };
type RoutesSectionItem = RouteRow | PlaceholderRow;

type Section =
	| { title: string; data: FavoriteRow[]; sectionKind: "favorites" }
	| { title: string; data: RoutesSectionItem[]; sectionKind: "routes" };

export default function HomeScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [routes, setRoutes] = useState<RouteItem[]>([]);
	const [favoritePlans, setFavoritePlans] = useState<FavoritePlanCard[]>([]);

	useEffect(() => {
		let isMounted = true;
		void (async () => {
			try {
				const accessToken = await getStoredAccessToken();
				if (!accessToken) {
					router.replace("/login");
					return;
				}
				const apiOrigin = getApiOrigin();
				if (!apiOrigin) {
					setErrorMessage("EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.");
					return;
				}

				const routeItems = await fetchRoutes(apiOrigin, accessToken);
				if (!isMounted) return;
				setRoutes(routeItems);

				const routeDetails = await Promise.all(
					routeItems.map((route) => fetchRouteDetail(apiOrigin, accessToken, route.id)),
				);
				if (!isMounted) return;
				routeDetails.forEach((detail, i) => {
					const id = routeItems[i]?.id;
					if (id) seedRouteDetailCache(queryClient, id, detail);
				});
				setFavoritePlans(getFavoritePlans(routeDetails));
			} catch (error: unknown) {
				if (!isMounted) return;
				setErrorMessage(
					error instanceof Error ? error.message : "홈 데이터를 불러오지 못했습니다.",
				);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [queryClient, router]);

	const sections: Section[] = [];

	if (favoritePlans.length > 0) {
		sections.push({
			title: "즐겨찾기한 나의 플랜",
			sectionKind: "favorites",
			data: favoritePlans.map((fp) => ({ ...fp, rowKind: "favorite" as const })),
		});
	}

	const routesSectionData: RoutesSectionItem[] = (() => {
		if (isLoading) return [{ rowKind: "loading" }];
		if (routes.length === 0) return [{ rowKind: "empty" }];
		return routes.map((r) => ({ ...r, rowKind: "route" as const }));
	})();

	sections.push({
		title: "나의 라우트",
		sectionKind: "routes",
		data: routesSectionData,
	});

	return (
		<ThemedView style={styles.container}>
			<SectionList<Section["data"][number]>
				style={styles.list}
				sections={sections}
				keyExtractor={(item, index) => {
					if ("rowKind" in item && item.rowKind === "favorite") {
						return `${item.routeId}:${item.planId}`;
					}
					if ("rowKind" in item && item.rowKind === "route") {
						return item.id;
					}
					return `placeholder-${index}`;
				}}
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={styles.listContent}
				stickySectionHeadersEnabled={false}
				renderSectionHeader={({ section: { title } }) => (
					<ThemedText type="subtitle" style={styles.sectionHeader}>
						{title}
					</ThemedText>
				)}
				SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
				renderItem={({ item, section }) => {
					if (section.sectionKind === "favorites" && item.rowKind === "favorite") {
						return (
							<Pressable
								style={({ pressed }) => [styles.row, pressed && styles.pressed]}
								onPress={() =>
									router.push({
										pathname: "/routes/[routeId]/plans/[planId]/schedule",
										params: { routeId: item.routeId, planId: item.planId },
									})
								}
							>
								<ThemedText type="smallBold" style={styles.routeTitle}>
									{item.planName}
								</ThemedText>
								<ThemedText
									type="caption"
									themeColor="textSecondary"
									style={[styles.routeMeta, { opacity: 0.78 }]}
									selectable
								>
									{item.routeName}
								</ThemedText>
							</Pressable>
						);
					}

					if (section.sectionKind === "routes") {
						if (item.rowKind === "loading") {
							return (
								<ThemedText type="small" style={styles.row}>
									불러오는 중...
								</ThemedText>
							);
						}
						if (item.rowKind === "empty") {
							return (
								<ThemedText type="small" style={styles.row}>
									저장된 라우트가 없습니다.
								</ThemedText>
							);
						}
						if (item.rowKind === "route") {
							return (
								<Pressable
									style={({ pressed }) => [styles.row, pressed && styles.pressed]}
									onPress={() => router.push(`/routes/${item.id}/plans`)}
								>
									<ThemedText type="smallBold" style={styles.routeTitle}>
										{item.name}
									</ThemedText>
									<ThemedText
										type="caption"
										themeColor="textSecondary"
										style={[styles.routeMeta, { opacity: 0.78 }]}
										selectable
									>
										{item.rwgps_url ?? ""}
									</ThemedText>
								</Pressable>
							);
						}
					}

					return null;
				}}
				ItemSeparatorComponent={() => (
					<View style={[styles.separator, { backgroundColor: theme.separator }]} />
				)}
				ListFooterComponent={
					errorMessage ? (
						<ThemedText type="small" style={[styles.errorText, { color: theme.danger }]} selectable>
							{errorMessage}
						</ThemedText>
					) : null
				}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "center",
	},
	list: {
		flex: 1,
		width: "100%",
		maxWidth: MaxContentWidth,
	},
	listContent: {
		paddingHorizontal: Spacing.four,
		paddingTop: Spacing.three,
		paddingBottom: BottomTabInset + Spacing.four,
		gap: 0,
	},
	sectionHeader: {
		paddingTop: Spacing.two,
		paddingBottom: Spacing.two,
	},
	sectionSpacer: {
		height: Spacing.three,
	},
	row: {
		gap: Spacing.half,
		paddingVertical: Spacing.three,
		paddingHorizontal: 0,
	},
	routeTitle: {
		fontSize: 15,
		lineHeight: 21,
	},
	routeMeta: {
		fontWeight: "400",
	},
	separator: {
		height: StyleSheet.hairlineWidth,
	},
	pressed: {
		opacity: 0.75,
	},
	errorText: {
		marginTop: Spacing.three,
	},
});
