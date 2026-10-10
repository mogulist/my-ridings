import { analyzeTerrain } from "@my-ridings/plan-geometry";
import {
	buildRideTerrainBriefing,
	terrainAscent,
	TERRAIN_LABELS,
	type RideTerrainPlan,
} from "@/features/plan-my-route/ride-terrain-data";
import type { TerrainSummary } from "@my-ridings/plan-geometry";
import type { RideSupplyPlan } from "./ride-supply-plan";
export { prepareRideSupplyPlan, type RideSupplyPlan } from "./ride-supply-plan";
import { computeTrackElevationGainLoss, planPoiBelongsToStage } from "@my-ridings/plan-geometry";

import type { TrackPoint } from "@/features/api/plan-my-route";

import type { RideLiveActivityProps } from "./mock-ride-snapshots";

export type RideFix = {
	latitude: number;
	longitude: number;
	accuracy: number | null;
	timestamp: number;
};

export type RidePosition = {
	km: number;
	timestamp: number;
};

/** Project onto segments, so sparse tracks don't turn a rider between samples into an off-route fix. */
export function locateRide(
	track: TrackPoint[],
	fix: RideFix,
	previous: RidePosition | null,
	now = Date.now(),
): { position: RidePosition | null; reason: string | null } {
	if (
		!Number.isFinite(fix.latitude) ||
		!Number.isFinite(fix.longitude) ||
		Math.abs(fix.latitude) > 90 ||
		Math.abs(fix.longitude) > 180 ||
		!Number.isFinite(fix.timestamp) ||
		now - fix.timestamp > 120_000 ||
		fix.timestamp > now + 10_000 ||
		(fix.accuracy != null &&
			(!Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 100))
	) {
		return { position: null, reason: "GPS 위치 확인 중" };
	}
	const scaleX = 111320 * Math.cos((fix.latitude * Math.PI) / 180);
	const elapsed = previous ? Math.max(0, (fix.timestamp - previous.timestamp) / 1000) : Infinity;
	// Keep nearby parallel/return sections from jumping many kilometres on a single GPS update.
	const maxTravelKm = Math.max(1, elapsed * 0.03);
	let nearest: { km: number; distance: number } | null = null;
	for (let index = 1; index < track.length; index++) {
		const a = track[index - 1];
		const b = track[index];
		if (a.d == null || b.d == null || b.d < a.d) continue;
		const ax = (a.x - fix.longitude) * scaleX;
		const ay = (a.y - fix.latitude) * 110574;
		const dx = (b.x - a.x) * scaleX;
		const dy = (b.y - a.y) * 110574;
		const lengthSquared = dx * dx + dy * dy;
		const t =
			lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
		const km = (a.d + (b.d - a.d) * t) / 1000;
		if (previous && Math.abs(km - previous.km) > maxTravelKm) continue;
		const distance = Math.hypot(ax + dx * t, ay + dy * t);
		if (!nearest || distance < nearest.distance) nearest = { km, distance };
	}
	if (!nearest || nearest.distance > 300) {
		return { position: null, reason: "경로 밖 · 복귀 후 갱신" };
	}
	return { position: { km: nearest.km, timestamp: fix.timestamp }, reason: null };
}

export function buildRideSupplySnapshot(
	plan: RideSupplyPlan | null,
	position: RidePosition | null,
	message: string | null = null,
): RideLiveActivityProps {
	const km = position?.km ?? null;
	const stageIndex =
		plan && km != null
			? plan.stages.findIndex(
					(stage, index) =>
						km >= stage.startDistanceKm &&
						(km < stage.endDistanceKm ||
							(index === plan.stages.length - 1 && km <= stage.endDistanceKm + 0.05)),
				)
			: -1;
	const stage = plan?.stages[stageIndex];
	const stops =
		plan && km != null && stage && !message
			? plan.stops
					.filter((stop) => stop.distanceKm >= km - 0.05 && planPoiBelongsToStage(stop, stage))
					.slice(0, 3)
			: [];
	const distance = (index: number) =>
		stops[index] && km != null
			? `${Math.max(0, stops[index].distanceKm - km).toFixed(1)} km`
			: null;
	const ascent = (index: number) => {
		const stop = stops[index];
		if (!plan || !stop || km == null) return null;
		const points = plan.track.filter(
			(point) => point.d! >= km * 1000 && point.d! <= stop.distanceKm * 1000,
		);
		if (points.some((point) => !Number.isFinite(point.e)) || points.length < 2) {
			return stop.distanceKm - km <= 0.05 ? "+0 m" : "고도 정보 없음";
		}
		return `+${computeTrackElevationGainLoss(plan.track, km, stop.distanceKm, plan.threshold).gain.toLocaleString()} m`;
	};
	const updated = position
		? new Date(position.timestamp).toLocaleTimeString("ko-KR", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			})
		: null;
	const status =
		message ??
		(!plan
			? "경로 불러오는 중"
			: km == null
				? "GPS 위치 확인 중"
				: !stage
					? "스테이지 경로 밖"
					: "남은 보급소 없음");
	const oldSnapshot: RideLiveActivityProps = {
		phase: "ride",
		phaseLabel: "라이딩",
		stageLabel: stage ? `스테이지 ${stageIndex + 1}` : "라이딩",
		progress: 0,
		progressLabel: "",
		remainingLabel: distance(0) ?? "보급",
		primaryLabel: stops.length ? `다음 보급 · ${updated} 갱신` : "실시간 현황",
		primaryName: stops[0]?.name ?? status,
		primaryDistance: distance(0) ?? "—",
		primaryAscent: ascent(0) ?? "",
		nextSupplyName: stops[1]?.name ?? null,
		nextSupplyDistance: distance(1),
		nextSupplyAscent: ascent(1),
		thirdSupplyName: stops[2]?.name ?? null,
		thirdSupplyDistance: distance(2),
		thirdSupplyAscent: ascent(2),
		secondaryLabel: updated ? `${updated} 위치 기준` : "위치 수신 대기",
		secondaryValue: "경로 기준 거리·획득고도",
		accentColor: stops.length ? "#FF9500" : "#8E8E93",
	};
	if (!plan || km == null || message || !stage) return oldSnapshot;
	// Older saved plans are upgraded once, before destination summaries are generated.
	plan.terrain ??= analyzeTerrain(plan.track);
	const b = buildRideTerrainBriefing(
		{ ...plan, terrain: plan.terrain, summitMarkers: plan.summitMarkers ?? [] } as RideTerrainPlan,
		km,
	);
	if (!b) return oldSnapshot;
	const primary = b.supply ?? b.approach ?? b.summit ?? b.finish;
	const compact = (summary: TerrainSummary) =>
		summary.segments
			.slice(0, 2)
			.map((s) => `${TERRAIN_LABELS[s.kind]} ${(s.endKm - s.startKm).toFixed(1)}km`)
			.join(" → ") + (summary.segments.length > 2 ? " …" : "");
	const climbTarget = b.approach ?? b.summit;
	const climbStats = b.climb
		? `오르막 자체 ${(b.climb.summitKm - b.climb.startKm).toFixed(1)}km · +${b.climb.gainM}m`
		: b.remainingClimbs == null
			? "남은 오르막 분석 불가"
			: "본격적인 오르막 없음";
	return {
		...oldSnapshot,
		primaryLabel: b.supply
			? "다음 보급소"
			: b.approach
				? "다음 오르막 시작"
				: b.summit
					? "오르막 진행 중"
					: "오늘 끝까지",
		primaryName: b.supply?.title ?? (b.climb ? b.climbName : b.finish.title),
		primaryDistance: `${primary.summary.distanceKm.toFixed(1)} km`,
		primaryAscent: terrainAscent(primary.summary),
		primaryTerrain: compact(primary.summary) || "목적지 도착",
		remainingLabel: `${primary.summary.distanceKm.toFixed(1)}km`,
		climbLabel:
			b.supply && b.climb
				? `${b.approach ? "다음 오르막" : "오르막 진행 중"} · ${b.climbName}`
				: null,
		climbDistance:
			b.supply && climbTarget
				? `${b.approach ? "시작" : "정상"} ${climbTarget.summary.distanceKm.toFixed(1)}km`
				: null,
		climbTerrain: b.supply && climbTarget ? compact(climbTarget.summary) : null,
		climbStats,
		secondaryLabel: updated ? `${updated} 위치 기준` : "위치 확인 중",
		secondaryValue: !b.supply
			? b.remainingClimbs == null
				? "남은 오르막 분석 불가"
				: `남은 오르막 ${b.remainingClimbs}개`
			: b.climb && b.climb.summitKm <= b.supply.endKm
				? "보급 전 오르막 통과"
				: b.climb && b.climb.startKm < b.supply.endKm
					? "보급소는 오르막 중간"
					: "지형 상세는 눌러서 확인",
		accentColor: b.supply ? "#FF9500" : "#0A84FF",
	};
}
