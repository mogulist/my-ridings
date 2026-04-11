import { put } from "@vercel/blob";
import { supabaseAdmin } from "@/lib/supabase";

type TrackPoint = {
	x: number;
	y: number;
};

type RouteCoverVariant = {
	key: "thumb" | "hero" | "og";
	width: number;
	height: number;
	useRetina: boolean;
};

type RegenerateRouteCoverInput = {
	routeId: string;
	rwgpsUrl: string;
};

type RegenerateRouteCoverResult = {
	cover_image_thumb_url: string | null;
	cover_image_hero_url: string | null;
	cover_image_og_url: string | null;
};

const ROUTE_COVER_VARIANTS: RouteCoverVariant[] = [
	{ key: "thumb", width: 640, height: 360, useRetina: false },
	{ key: "hero", width: 1280, height: 720, useRetina: true },
	{ key: "og", width: 1200, height: 630, useRetina: false },
];

const DEFAULT_MAPBOX_STYLE_ID = "mapbox/outdoors-v12";
const DEFAULT_ROUTE_COVER_PREFIX = "route-covers";
const MAX_STATIC_POINTS = 220;

export async function regenerateRouteCoverImages({
	routeId,
	rwgpsUrl,
}: RegenerateRouteCoverInput): Promise<RegenerateRouteCoverResult> {
	const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
	if (!mapboxToken) {
		throw new Error("MAPBOX_ACCESS_TOKEN is not configured");
	}

	const rwgpsRouteId = parseRwgpsRouteId(rwgpsUrl);
	if (!rwgpsRouteId) {
		throw new Error("Invalid RideWithGPS URL");
	}

	const sourcePoints = await fetchRwgpsTrackPoints(rwgpsRouteId);
	const sampledPoints = sampleTrackPoints(sourcePoints, MAX_STATIC_POINTS);
	if (sampledPoints.length < 2) {
		throw new Error("Not enough route points to render a cover image");
	}

	const timestamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "");
	const coverPrefix = process.env.ROUTE_COVER_BLOB_PREFIX || DEFAULT_ROUTE_COVER_PREFIX;
	const mapboxStyleId = process.env.MAPBOX_STYLE_ID || DEFAULT_MAPBOX_STYLE_ID;
	const overlay = encodeURIComponent(
		JSON.stringify({
			type: "Feature",
			geometry: {
				type: "LineString",
				coordinates: sampledPoints.map((point) => [point.x, point.y]),
			},
			properties: {
				stroke: "#2563eb",
				"stroke-width": 5,
				"stroke-opacity": 0.95,
			},
		}),
	);

	const uploads = await Promise.all(
		ROUTE_COVER_VARIANTS.map(async (variant) => {
			const pngBuffer = await fetchMapboxStaticImage({
				overlay,
				mapboxStyleId,
				mapboxToken,
				variant,
			});
			const blob = await put(
				`${coverPrefix}/${routeId}/${variant.key}-${timestamp}.png`,
				pngBuffer,
				{
					access: "public",
					contentType: "image/png",
					addRandomSuffix: true,
				},
			);
			return [variant.key, blob.url] as const;
		}),
	);

	const coverByKey = Object.fromEntries(uploads) as Record<RouteCoverVariant["key"], string>;
	const payload: RegenerateRouteCoverResult & { cover_image_generated_at: string } = {
		cover_image_thumb_url: coverByKey.thumb ?? null,
		cover_image_hero_url: coverByKey.hero ?? null,
		cover_image_og_url: coverByKey.og ?? null,
		cover_image_generated_at: new Date().toISOString(),
	};

	const { error } = await supabaseAdmin.from("route").update(payload).eq("id", routeId);
	if (error) {
		throw new Error(`Failed to update route covers: ${error.message}`);
	}

	return {
		cover_image_thumb_url: payload.cover_image_thumb_url,
		cover_image_hero_url: payload.cover_image_hero_url,
		cover_image_og_url: payload.cover_image_og_url,
	};
}

function parseRwgpsRouteId(rwgpsUrl: string): string | null {
	const matched = rwgpsUrl.match(/\/routes\/(\d+)/);
	return matched?.[1] ?? null;
}

async function fetchRwgpsTrackPoints(routeId: string): Promise<TrackPoint[]> {
	const response = await fetch(`https://ridewithgps.com/routes/${routeId}.json`, {
		headers: {
			Accept: "application/json",
			"User-Agent": "plan-my-route/1.0",
		},
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(`RideWithGPS returned ${response.status}`);
	}

	const json = (await response.json()) as { track_points?: unknown[] };
	const normalized = (json.track_points ?? [])
		.map((point) => toTrackPoint(point))
		.filter((point): point is TrackPoint => point !== null);
	return normalized;
}

function toTrackPoint(raw: unknown): TrackPoint | null {
	if (!raw || typeof raw !== "object") return null;
	const point = raw as { x?: unknown; y?: unknown };
	const x = Number(point.x);
	const y = Number(point.y);
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	return { x, y };
}

function sampleTrackPoints(points: TrackPoint[], maxPoints: number): TrackPoint[] {
	if (points.length <= maxPoints) return points;
	const stride = Math.ceil(points.length / maxPoints);
	const sampled = points.filter((_, index) => index % stride === 0);
	const last = points[points.length - 1];
	const sampledLast = sampled[sampled.length - 1];
	if (!sampledLast || sampledLast.x !== last.x || sampledLast.y !== last.y) {
		sampled.push(last);
	}
	return sampled;
}

async function fetchMapboxStaticImage({
	overlay,
	mapboxStyleId,
	mapboxToken,
	variant,
}: {
	overlay: string;
	mapboxStyleId: string;
	mapboxToken: string;
	variant: RouteCoverVariant;
}): Promise<Buffer> {
	const scaleSuffix = variant.useRetina ? "@2x" : "";
	const url =
		`https://api.mapbox.com/styles/v1/${mapboxStyleId}/static/geojson(${overlay})/auto/` +
		`${variant.width}x${variant.height}${scaleSuffix}` +
		`?padding=56,56,56,56&logo=false&attribution=false&access_token=${encodeURIComponent(mapboxToken)}`;

	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) {
		const message = await response.text();
		throw new Error(`Mapbox static image failed (${response.status}): ${message}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}
