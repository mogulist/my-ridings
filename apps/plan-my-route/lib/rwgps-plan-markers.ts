import type { SummitCatalogRow } from "@/app/types/summitCatalog";

const SUMMIT_SNAP_RADIUS_M = 200;

function haversineMeters(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** RWGPS 경로 트랙 포인트 (ElevationProfile·KakaoMap과 동일 스키마) */
export type RwgpsTrackPoint = {
	x: number;
	y: number;
	e?: number;
	d?: number;
};

export type RwgpsPointOfInterest = {
	id: number;
	name: string;
	lat: number;
	lng: number;
	poi_type_name: string;
};

export type CPOnRoute = {
	id: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

export type SummitOnRoute = {
	id: string;
	/** 동일 서밋을 경로에서 여러 번 지날 때 통과 순서 (0-based) */
	passIndex: number;
	name: string;
	distanceKm: number;
	elevation: number;
	trackPointIndex: number;
};

const SUMMIT_PASS_GAP_M = 500;

export function summitMarkerKey(marker: Pick<SummitOnRoute, "id" | "passIndex">): string {
	return `${marker.id}:${marker.passIndex}`;
}

export function summitScheduleRowKey(marker: Pick<SummitOnRoute, "id" | "passIndex">): string {
	return `summit:${summitMarkerKey(marker)}`;
}

export function parseSummitScheduleRowKey(
	rowKey: string,
): { id: string; passIndex: number } | null {
	if (!rowKey.startsWith("summit:")) return null;
	const body = rowKey.slice(7);
	if (!body) return null;
	const lastColon = body.lastIndexOf(":");
	if (lastColon === -1) return { id: body, passIndex: 0 };
	const passIndex = Number(body.slice(lastColon + 1));
	const id = body.slice(0, lastColon);
	if (!id || !Number.isFinite(passIndex)) return null;
	return { id, passIndex };
}

function findNearTrackIndices(
	summit: SummitCatalogRow,
	trackPoints: RwgpsTrackPoint[],
): number[] {
	const indices: number[] = [];
	for (let i = 0; i < trackPoints.length; i++) {
		const tp = trackPoints[i]!;
		const distM = haversineMeters(summit.lat, summit.lng, tp.y, tp.x);
		if (distM <= SUMMIT_SNAP_RADIUS_M) indices.push(i);
	}
	return indices;
}

function clusterIndicesByAlongTrackGap(
	trackPoints: RwgpsTrackPoint[],
	indices: number[],
): number[][] {
	if (indices.length === 0) return [];
	const clusters: number[][] = [[indices[0]!]];
	for (let j = 1; j < indices.length; j++) {
		const prevIdx = indices[j - 1]!;
		const currIdx = indices[j]!;
		const prevD = trackPoints[prevIdx]?.d ?? 0;
		const currD = trackPoints[currIdx]?.d ?? 0;
		if (Math.abs(currD - prevD) > SUMMIT_PASS_GAP_M) {
			clusters.push([currIdx]);
		} else {
			clusters[clusters.length - 1]!.push(currIdx);
		}
	}
	return clusters;
}

function bestIndexInCluster(
	summit: SummitCatalogRow,
	trackPoints: RwgpsTrackPoint[],
	cluster: number[],
): number {
	let bestIdx = cluster[0]!;
	let bestDist = Infinity;
	for (const i of cluster) {
		const tp = trackPoints[i]!;
		const distM = haversineMeters(summit.lat, summit.lng, tp.y, tp.x);
		if (distM < bestDist) {
			bestDist = distM;
			bestIdx = i;
		}
	}
	return bestIdx;
}

export function computeCPsOnRoute(
	pois: RwgpsPointOfInterest[],
	trackPoints: RwgpsTrackPoint[],
): CPOnRoute[] {
	const controls = pois.filter((p) => p.poi_type_name?.toLowerCase() === "control");
	if (controls.length === 0 || trackPoints.length === 0) return [];

	return controls
		.map((poi) => {
			let bestIdx = 0;
			let bestDist = Infinity;
			for (let i = 0; i < trackPoints.length; i++) {
				const tp = trackPoints[i]!;
				const d2 = (tp.y - poi.lat) ** 2 + (tp.x - poi.lng) ** 2;
				if (d2 < bestDist) {
					bestDist = d2;
					bestIdx = i;
				}
			}
			const tp = trackPoints[bestIdx]!;
			return {
				id: poi.id,
				name: poi.name,
				distanceKm: (tp.d ?? 0) / 1000,
				elevation: tp.e ?? 0,
				trackPointIndex: bestIdx,
			};
		})
		.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function computeSummitsOnRoute(
	summits: SummitCatalogRow[],
	trackPoints: RwgpsTrackPoint[],
): SummitOnRoute[] {
	if (summits.length === 0 || trackPoints.length === 0) return [];
	const results: SummitOnRoute[] = [];
	for (const summit of summits) {
		const nearIndices = findNearTrackIndices(summit, trackPoints);
		const clusters = clusterIndicesByAlongTrackGap(trackPoints, nearIndices);
		for (let passIndex = 0; passIndex < clusters.length; passIndex++) {
			const cluster = clusters[passIndex]!;
			const bestIdx = bestIndexInCluster(summit, trackPoints, cluster);
			const tp = trackPoints[bestIdx]!;
			results.push({
				id: summit.id,
				passIndex,
				name: summit.name,
				distanceKm: (tp.d ?? 0) / 1000,
				elevation: summit.elevation_m ?? tp.e ?? 0,
				trackPointIndex: bestIdx,
			});
		}
	}
	return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function summitQueryStringForTrackPoints(trackPoints: RwgpsTrackPoint[]): string | null {
	if (trackPoints.length === 0) return null;
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const point of trackPoints) {
		if (point.y < minLat) minLat = point.y;
		if (point.y > maxLat) maxLat = point.y;
		if (point.x < minLng) minLng = point.x;
		if (point.x > maxLng) maxLng = point.x;
	}
	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}
	const buffer = 0.01;
	const search = new URLSearchParams({
		minLat: String(minLat - buffer),
		maxLat: String(maxLat + buffer),
		minLng: String(minLng - buffer),
		maxLng: String(maxLng + buffer),
		limit: "1200",
	});
	return search.toString();
}
