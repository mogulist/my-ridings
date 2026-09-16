import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ListItemCard } from "@/components/ui/list-item-card";
import { ListRefreshControl } from "@/components/ui/list-refresh-control";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { getFavoritePlans, type RouteItem } from "@/features/api/plan-my-route";
import {
	fetchRouteDetailQuery,
	routeDetailQueryKey,
} from "@/features/plan-my-route/route-detail-query";
import { useRouteListQuery } from "@/features/plan-my-route/route-list-query";
import { useTheme } from "@/hooks/use-theme";
import { REVIEW_QUERY_OPTIONS } from "@/lib/query-cache";

function formatRouteListDate(isoOrDate: string | undefined | null, fallbackIso: string | undefined) {
	const raw = (isoOrDate && isoOrDate.trim() ? isoOrDate : fallbackIso) ?? "";
	if (!raw) return null;
	// "YYYY-MM-DD" 또는 ISO 데이트
	const datePart = raw.slice(0, 10);
	const [y, m, d] = datePart.split("-").map(Number);
	if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return raw;
	return `${y}. ${m}. ${d}.`;
}

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

const EMPTY_ROUTES: RouteItem[] = [];

export default function HomeScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();
	const [favoritePlans, setFavoritePlans] = useState<FavoritePlanCard[]>([]);
	const {
		data: routeData,
		dataUpdatedAt,
		error,
		isPending,
		isRefetching,
		refetch,
	} = useRouteListQuery();
	const routes = routeData ?? EMPTY_ROUTES;

	useEffect(() => {
		if (error?.message === "UNAUTHENTICATED") {
			router.replace("/login");
		}
	}, [error, router]);

	useEffect(() => {
		let isCancelled = false;
		const routeIds = new Set(routes.map((route) => route.id));
		setFavoritePlans((current) => current.filter((favorite) => routeIds.has(favorite.routeId)));

		void (async () => {
			for (const route of routes) {
				if (isCancelled) return;
				try {
					const detail = await queryClient.fetchQuery({
						queryKey: routeDetailQueryKey(route.id),
						queryFn: () => fetchRouteDetailQuery(route.id),
						...REVIEW_QUERY_OPTIONS,
					});
					if (isCancelled) return;
					const favorites = getFavoritePlans([detail]);
					setFavoritePlans((current) => [
						...current.filter((favorite) => favorite.routeId !== route.id),
						...favorites,
					]);
				} catch {
					// 한 라우트의 상세 조회 실패가 나머지 라우트 표시를 막지 않게 한다.
				}
			}
		})();

		return () => {
			isCancelled = true;
		};
	}, [dataUpdatedAt, queryClient, routes]);

	const errorMessage =
		error && error.message !== "UNAUTHENTICATED" ? error.message : null;

	const sections: Section[] = [];

	if (favoritePlans.length > 0) {
		sections.push({
			title: "즐겨찾기한 나의 플랜",
			sectionKind: "favorites",
			data: favoritePlans.map((fp) => ({ ...fp, rowKind: "favorite" as const })),
		});
	}

	const routesSectionData: RoutesSectionItem[] = (() => {
		if (isPending) return [{ rowKind: "loading" }];
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
				refreshControl={
					<ListRefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
				}
				renderSectionHeader={({ section: { title } }) => (
					<ThemedText type="subtitle" style={styles.sectionHeader}>
						{title}
					</ThemedText>
				)}
				SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
				renderItem={({ item, section }) => {
					if (section.sectionKind === "favorites" && item.rowKind === "favorite") {
						return (
							<ListItemCard>
								<Pressable
									style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
									onPress={() =>
										router.push({
											pathname: "/routes/[routeId]/plans/[planId]/schedule",
											params: { routeId: item.routeId, planId: item.planId },
										})
									}
								>
									<View style={styles.cardPad}>
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
									</View>
								</Pressable>
							</ListItemCard>
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
							const dateLine = formatRouteListDate(
								item.start_date ?? null,
								item.created_at,
							);
							return (
								<ListItemCard>
									<Pressable
										style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
										onPress={() => router.push(`/routes/${item.id}/plans`)}
									>
										<View style={styles.routeRow}>
											<View style={styles.thumbClip}>
												{item.cover_image_thumb_url ? (
													<Image
														source={{ uri: item.cover_image_thumb_url }}
														style={styles.thumbImageFill}
														contentFit="cover"
														transition={120}
													/>
												) : (
													<View
														style={[
															styles.thumbImageFill,
															{ backgroundColor: theme.backgroundElement },
														]}
													/>
												)}
											</View>
											<View style={styles.cardContent}>
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
												{dateLine ? (
													<ThemedText
														type="caption"
														themeColor="textSecondary"
														style={styles.routeDate}
													>
														{dateLine}
													</ThemedText>
												) : null}
											</View>
										</View>
									</Pressable>
								</ListItemCard>
							);
						}
					}

					return null;
				}}
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
		gap: Spacing.two,
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
		paddingVertical: Spacing.two,
	},
	cardPressable: {
		flex: 1,
	},
	cardPad: {
		gap: Spacing.half,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
	},
	routeRow: {
		flexDirection: "row",
		alignItems: "stretch",
	},
	thumbClip: {
		width: 120,
		aspectRatio: 1,
		overflow: "hidden",
		alignSelf: "center",
	},
	thumbImageFill: {
		...StyleSheet.absoluteFillObject,
	},
	cardContent: {
		flex: 1,
		gap: Spacing.half,
		justifyContent: "center",
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
	},
	routeTitle: {
		fontSize: 15,
		lineHeight: 21,
	},
	routeMeta: {
		fontWeight: "400",
	},
	routeDate: {
		marginTop: Spacing.one,
		fontSize: 12,
		opacity: 0.7,
	},
	pressed: {
		opacity: 0.75,
	},
	errorText: {
		marginTop: Spacing.three,
	},
});
