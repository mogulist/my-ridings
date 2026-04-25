import type { DailyRow, StageMidPoint, StagePointPosition } from "@my-ridings/weather-types";

/**
 * view-only. 경로상 `daily` 서명이 같은 포인트를 하나의 카드로 묶은 형태.
 * 중기예보는 광역 구역 단위이므로 인접 여부와 무관하게 동일 구역을 하나로 통합한다.
 */
export type StageMidPointGroup = {
	key: string;
	members: StageMidPoint[];
	/** 대표 daily — members[0].daily */
	daily: DailyRow | null;
	kmFrom: number;
	kmTo: number;
	position: StagePointPosition;
	midpoint: { lat: number; lng: number };
	nx: number;
	ny: number;
	gridCount: number;
	regionNames: string[];
	repeatOfKey: string | null;
};

const normSky = (s: string | null | undefined): string => (s?.trim() ?? "").trim();

const dailySignature = (d: DailyRow | null): string => {
	if (d == null) return "__null__";
	return [
		d.date,
		d.tmn ?? "∅",
		d.tmx ?? "∅",
		normSky(d.amSky),
		normSky(d.pmSky),
		d.amPop ?? "∅",
		d.pmPop ?? "∅",
	].join("|");
};

const pickPosition = (members: StageMidPoint[]): StagePointPosition => {
	if (members.some((m) => m.position === "departure")) return "departure";
	if (members.some((m) => m.position === "arrival")) return "arrival";
	return "along";
};

const uniqRegionNames = (members: StageMidPoint[]): string[] => {
	const out: string[] = [];
	for (const m of members) {
		const name = m.regionName?.trim();
		if (!name) continue;
		if (!out.includes(name)) out.push(name);
	}
	return out;
};

const uniqGridCount = (members: StageMidPoint[]): number => {
	const set = new Set<string>();
	for (const m of members) set.add(`${m.nx},${m.ny}`);
	return set.size;
};

const groupKey = (members: StageMidPoint[]): string => {
	const first = members[0]!;
	const last = members[members.length - 1]!;
	return members.length === 1 ? `mid-g-${first.index}` : `mid-g-${first.index}-${last.index}`;
};

const toGroup = (members: StageMidPoint[], repeatOfKey: string | null): StageMidPointGroup => {
	const first = members[0]!;
	const last = members[members.length - 1]!;
	const midIdx = Math.floor((members.length - 1) / 2);
	const mid = members[midIdx]!;
	return {
		key: groupKey(members),
		members,
		daily: first.daily,
		kmFrom: first.kmFrom,
		kmTo: last.kmTo,
		position: pickPosition(members),
		midpoint: mid.midpoint,
		nx: first.nx,
		ny: first.ny,
		gridCount: uniqGridCount(members),
		regionNames: uniqRegionNames(members),
		repeatOfKey,
	};
};

/**
 * 경로 전체 포인트를 `daily` 서명 기준으로 그룹화한다.
 * - `daily === null` 인 포인트는 제외한다 (중기 예보 없음 카드 미표시).
 * - 인접 여부와 무관하게 동일 서명을 하나의 그룹으로 통합한다.
 */
export const mergeMidPoints = (points: StageMidPoint[]): StageMidPointGroup[] => {
	if (points.length === 0) return [];
	const bySignature = new Map<string, StageMidPoint[]>();
	const order: string[] = [];
	for (const p of points) {
		if (p.daily === null) continue;
		const sig = dailySignature(p.daily);
		if (!bySignature.has(sig)) {
			bySignature.set(sig, []);
			order.push(sig);
		}
		bySignature.get(sig)!.push(p);
	}
	return order.map((sig) => toGroup(bySignature.get(sig)!, null));
};

/** 디버깅용: 병합 없이 격자(포인트)마다 1그룹. */
export const midPointsAsSingletonGroups = (points: StageMidPoint[]): StageMidPointGroup[] =>
	points.map((p) => toGroup([p], null));
