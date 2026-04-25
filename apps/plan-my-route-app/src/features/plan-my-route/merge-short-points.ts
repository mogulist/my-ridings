import type {
	HourlyForecast,
	StagePointPosition,
	StageShortPoint,
} from "@my-ridings/weather-types";

/** 단기 예보 카드를 "유사 예보 구간"으로 병합할 때 사용하는 임계값. */
export const MERGE_THRESHOLDS = {
	tempMaxDelta: 3,
	tempMeanDelta: 1.5,
	/** 첫 카드가 이보다 짧고 다음 카드와 지역명이 같으면 다음 카드에 흡수된다. */
	departureTailKm: 0.5,
} as const;

/**
 * 시간대별로 의미 있는 기온(최저/최고)을 하나 고른다.
 * - 아침 10시 전: 최저(아직 추워지는 구간의 관심값)
 * - 10~17시: 최고(한낮 최고기온)
 * - 17시 이후: 최저(다시 떨어지는 기온)
 */
export const pickDisplayTempC = (range: HourlyTempRange, kstHour: number): number | null => {
	if (range.tempCMin == null || range.tempCMax == null) return null;
	if (kstHour < 10) return range.tempCMin;
	if (kstHour <= 17) return range.tempCMax;
	return range.tempCMin;
};

/** 시간별 기온 min~max. `null`은 결측. */
export type HourlyTempRange = {
	at: string;
	tempCMin: number | null;
	tempCMax: number | null;
};

/**
 * view-only 타입. 서버 응답의 `StageShortPoint` 여러 개를 시각적으로 1장의 카드로 묶은 형태.
 * 병합 조건을 만족하는 연속 포인트끼리만 같은 그룹이 된다.
 */
export type StageShortPointGroup = {
	/** 고유 key. FlatList 용. */
	key: string;
	/** 그룹을 구성하는 원본 포인트들 (경로 순서). */
	members: StageShortPoint[];
	/** 대표 hourly (members[0].hourly). 아이콘/팝/강수는 여기 값을 그대로 사용. */
	representativeHourly: HourlyForecast[];
	/** 시간별 기온 min~max. */
	hourlyTemps: HourlyTempRange[];
	/** 누적 km 시작/끝 (경로 순서 기준). */
	kmFrom: number;
	kmTo: number;
	/** 그룹을 대표하는 position. 멤버 중 `departure`/`arrival` 있으면 우선. */
	position: StagePointPosition;
	/** 대표 좌표 (멤버 중 가운데 포인트 기준). */
	midpoint: { lat: number; lng: number };
	/** 대표 격자 (첫 멤버). */
	nx: number;
	ny: number;
	/** 그룹 내 고유 격자 수 (표시용). */
	gridCount: number;
	/** 그룹 내 고유 지역명(공백 trim, 빈 문자열/null 제외). */
	regionNames: string[];
	/**
	 * 이 그룹이 이전에 등장한 동일 예보 그룹의 반복이라면 그 그룹의 key.
	 * `null`이면 처음 등장.
	 */
	repeatOfKey: string | null;
};

const popBucket = (pop: number | null, rainMm: number | null): "none" | "mid" | "hi" | "wet" => {
	if (rainMm != null && rainMm > 0) return "wet";
	if (pop == null || pop < 30) return "none";
	if (pop < 60) return "mid";
	return "hi";
};

const hasWet = (p: StageShortPoint): boolean =>
	p.hourly.some((h) => (h.rainMm ?? 0) > 0 || (h.snowCm ?? 0) > 0 || (h.pty ?? 0) > 0);

const skyPtySignature = (p: StageShortPoint): string =>
	p.hourly.map((h) => `${h.sky ?? "_"}:${h.pty ?? 0}`).join("|");

const popBucketSignature = (p: StageShortPoint): string =>
	p.hourly.map((h) => popBucket(h.popPct, h.rainMm)).join("|");

/** 두 포인트의 시간별 기온 절대차 (max, mean). 결측 슬롯은 스킵. */
const tempDeltas = (a: StageShortPoint, b: StageShortPoint): { max: number; mean: number } => {
	if (a.hourly.length !== b.hourly.length)
		return { max: Number.POSITIVE_INFINITY, mean: Number.POSITIVE_INFINITY };
	let max = 0;
	let sum = 0;
	let n = 0;
	for (let i = 0; i < a.hourly.length; i += 1) {
		const ta = a.hourly[i]?.tempC;
		const tb = b.hourly[i]?.tempC;
		if (ta == null || tb == null) continue;
		const d = Math.abs(ta - tb);
		if (d > max) max = d;
		sum += d;
		n += 1;
	}
	return { max, mean: n === 0 ? 0 : sum / n };
};

const canMerge = (rep: StageShortPoint, p: StageShortPoint): boolean => {
	if (skyPtySignature(rep) !== skyPtySignature(p)) return false;
	if (popBucketSignature(rep) !== popBucketSignature(p)) return false;
	if (hasWet(rep) !== hasWet(p)) return false;
	const { max, mean } = tempDeltas(rep, p);
	return max <= MERGE_THRESHOLDS.tempMaxDelta && mean <= MERGE_THRESHOLDS.tempMeanDelta;
};

const pickPosition = (members: StageShortPoint[]): StagePointPosition => {
	if (members.some((m) => m.position === "departure")) return "departure";
	if (members.some((m) => m.position === "arrival")) return "arrival";
	return "along";
};

const computeHourlyTemps = (members: StageShortPoint[]): HourlyTempRange[] => {
	const first = members[0];
	if (!first) return [];
	return first.hourly.map((h, i) => {
		let lo: number | null = null;
		let hi: number | null = null;
		for (const m of members) {
			const t = m.hourly[i]?.tempC;
			if (t == null) continue;
			if (lo == null || t < lo) lo = t;
			if (hi == null || t > hi) hi = t;
		}
		return { at: h.at, tempCMin: lo, tempCMax: hi };
	});
};

const uniqRegionNames = (members: StageShortPoint[]): string[] => {
	const out: string[] = [];
	for (const m of members) {
		const name = m.regionName?.trim();
		if (!name) continue;
		if (!out.includes(name)) out.push(name);
	}
	return out;
};

const uniqGridCount = (members: StageShortPoint[]): number => {
	const set = new Set<string>();
	for (const m of members) set.add(`${m.nx},${m.ny}`);
	return set.size;
};

const groupKey = (members: StageShortPoint[]): string => {
	const first = members[0]!;
	const last = members[members.length - 1]!;
	return members.length === 1 ? `g-${first.index}` : `g-${first.index}-${last.index}`;
};

const toGroup = (members: StageShortPoint[], repeatOfKey: string | null): StageShortPointGroup => {
	const first = members[0]!;
	const last = members[members.length - 1]!;
	const midIdx = Math.floor((members.length - 1) / 2);
	const mid = members[midIdx]!;
	return {
		key: groupKey(members),
		members,
		representativeHourly: first.hourly,
		hourlyTemps: computeHourlyTemps(members),
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
 * 경로 순서대로 연속된 포인트들을 `canMerge` 조건으로 런-머지한다.
 * 새 그룹이 시작될 때 이미 만들어진 그룹들 중 같은 조건을 만족하는 것이 있으면
 * `repeatOfKey`에 그 그룹의 key를 기록한다. (비연속 재등장 → 요약 스트립으로 UI에서 표시)
 */
export const mergeShortPoints = (points: StageShortPoint[]): StageShortPointGroup[] => {
	if (points.length === 0) return [];
	const result: StageShortPointGroup[] = [];
	let curMembers: StageShortPoint[] = [];
	const finalizeCurrent = () => {
		if (curMembers.length === 0) return;
		const rep = curMembers[0];
		if (!rep) return;
		const prior = result.find((g) => {
			const head = g.members[0];
			return head ? canMerge(head, rep) : false;
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
		if (rep && canMerge(rep, p)) {
			curMembers.push(p);
			continue;
		}
		finalizeCurrent();
		curMembers.push(p);
	}
	finalizeCurrent();
	return absorbShortDepartureTail(result);
};

/** 디버깅용: 병합 없이 격자(포인트)마다 1그룹. */
export const shortPointsAsSingletonGroups = (points: StageShortPoint[]): StageShortPointGroup[] =>
	points.map((p) => toGroup([p], null));

/**
 * 첫 그룹이 "매우 짧은 단일 포인트"이고 두 번째 그룹의 지역명과 일치하면
 * 두 번째 그룹 앞에 흡수하고 `position=departure`로 승격한다.
 * 예: 0.0–0.2km 구례군 카드 → 0.4–2.8km 구례군 카드에 합쳐져 하나의 "출발" 카드로.
 */
const absorbShortDepartureTail = (groups: StageShortPointGroup[]): StageShortPointGroup[] => {
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
	const secondRegion = second.members[0]?.regionName?.trim() ?? "";
	const regionMatches = firstRegion === "" || secondRegion === "" || firstRegion === secondRegion;
	if (!regionMatches) return groups;
	const mergedMembers = [head, ...second.members];
	const absorbed = toGroup(mergedMembers, second.repeatOfKey);
	// 합쳐졌어도 "출발"은 유지
	const withDeparture: StageShortPointGroup = { ...absorbed, position: "departure" };
	return [withDeparture, ...groups.slice(2)];
};
