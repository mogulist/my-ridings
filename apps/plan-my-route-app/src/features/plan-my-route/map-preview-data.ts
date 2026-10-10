import type { PlanDetail } from "@/features/api/plan-my-route";
export const MAP_PREVIEW_DETAIL: PlanDetail = {
	plan: {
		id: "preview",
		name: "지도 예시",
		start_date: null,
		review_note: null,
		public_share_token: "",
		shared_at: null,
	},
	route: {
		name: "가상 코스",
		rwgps_url: "",
		total_distance: 30000,
		elevation_gain: 0,
		elevation_loss: 0,
		cover_image_hero_url: null,
		cover_image_og_url: null,
	},
	stages: [0, 1, 2].map((i) => ({
		id: `stage-${i}`,
		title: null,
		start_distance: i * 10000,
		end_distance: (i + 1) * 10000,
		elevation_gain: 0,
		elevation_loss: 0,
		memo: null,
		start_name: `출발 ${i + 1}`,
		end_name: `도착 ${i + 1}`,
	})),
	trackPoints: Array.from({ length: 301 }, (_, i) => ({
		d: i * 100,
		e: 100,
		x: 127 + i * 0.002,
		y: 37 + Math.sin(i / 20) * 0.03,
	})),
	planPois: [],
	officialSummits: [],
	knownRouteElevationGainM: 0,
	cpMarkers: [
		{ id: 1, name: "CP 1", distanceKm: 5, elevation: 100, trackPointIndex: 50 },
		{ id: 2, name: "CP 2", distanceKm: 15, elevation: 100, trackPointIndex: 150 },
	],
	summitMarkers: [
		{
			id: "summit",
			passIndex: 0,
			name: "예시 고개",
			distanceKm: 25,
			elevation: 100,
			trackPointIndex: 250,
		},
	],
};
