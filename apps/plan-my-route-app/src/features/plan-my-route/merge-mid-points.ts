import type { DailyRow, StageMidPoint, StagePointPosition } from "@my-ridings/weather-types";

import { MERGE_THRESHOLDS } from "./merge-short-points";

/**
 * view-only. 연속 격자 중 `daily` 서명이 같은 포인트를 한 카드로 묶은 형태.
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

const canMergeMid = (a: StageMidPoint, b: StageMidPoint): boolean =>
	dailySignature(a.daily) === dailySignature(b.daily);

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
 * 경로 순서대로 연속 포인트를 동일 `daily` 서명 기준으로 런-병합한다.
 * 비연속으로 같은 서명이 다시 나오면 `repeatOfKey`를 채운다.
 */
export const mergeMidPoints = (points: StageMidPoint[]): StageMidPointGroup[] => {
	if (points.length === 0) return [];
	const result: StageMidPointGroup[] = [];
	let curMembers: StageMidPoint[] = [];
	const finalizeCurrent = () => {
		if (curMembers.length === 0) return;
		const rep = curMembers[0];
		if (!rep) return;
		const prior = result.find((g) => {
			const head = g.members[0];
			return head ? canMergeMid(head, rep) : false;
		});
		result.push(toGroup(curMembers, prior?.key ?? null));
		curMembers = [];
	};
	for (const p of points) {
		if (curMembers.length === 0) {
			curMembers.push(p);
			continue;
		}
		const rep = curMembers[0];
		if (rep && canMergeMid(rep, p)) {
			curMembers.push(p);
			continue;
		}
		finalizeCurrent();
		curMembers.push(p);
	}
	finalizeCurrent();
	return absorbMidDepartureTail(result);
};

/** 디버깅용: 병합 없이 격자(포인트)마다 1그룹. */
export const midPointsAsSingletonGroups = (points: StageMidPoint[]): StageMidPointGroup[] =>
	points.map((p) => toGroup([p], null));

const absorbMidDepartureTail = (groups: StageMidPointGroup[]): StageMidPointGroup[] => {
	if (groups.length < 2) return groups;
	const first = groups[0];
	const second = groups[1];
	if (!first || !second) return groups;
	if (first.members.length !== 1) return groups;
	const head = first.members[0];
	if (!head) return groups;
	const tailKm = head.kmTo - head.kmFrom;
	if (tailKm >= MERGE_THRESHOLDS.departureTailKm) return groups;
	const firstRegion = head.regionName?.trim() ?? "";
	const secondHead = second.members[0];
	if (!secondHead) return groups;
	const secondRegion = secondHead.regionName?.trim() ?? "";
	const regionMatches = firstRegion === "" || secondRegion === "" || firstRegion === secondRegion;
	if (!regionMatches) return groups;
	if (!canMergeMid(head, secondHead)) return groups;
	const mergedMembers = [head, ...second.members];
	const absorbed = toGroup(mergedMembers, second.repeatOfKey);
	const withDeparture: StageMidPointGroup = { ...absorbed, position: "departure" };
	return [withDeparture, ...groups.slice(2)];
};
