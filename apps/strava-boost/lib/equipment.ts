import type { StravaActivity } from "@/types/strava";

export const slots = {
	wheelset: { label: "휠셋", kind: "wheelset" },
	tire_front: { label: "앞 타이어", kind: "tire" },
	tire_rear: { label: "뒤 타이어", kind: "tire" },
	chain: { label: "체인", kind: "chain" },
	cassette: { label: "스프라켓", kind: "cassette" },
	brake_front: { label: "앞 브레이크", kind: "brake" },
	brake_rear: { label: "뒤 브레이크", kind: "brake" },
} as const;
export type Slot = keyof typeof slots;
export type PartKind = (typeof slots)[Slot]["kind"];
export type Configuration = Partial<Record<Slot, string>>;
export type Bike = { id: string; name: string; stravaGearId: string | null };
export type Part = {
	id: string;
	name: string;
	kind: PartKind;
	startedAt: string;
	initialKm: number;
	retiredAt: string | null;
};
export type Installation = { id: string; bikeId: string; at: string; parts: Configuration };
export type Assignment = { activityId: number; bikeId: string; parts: Configuration };
export type Preset = { id: string; bikeId: string; name: string; parts: Configuration };
export type ServiceRule = {
	id: string;
	targetId: string;
	name: string;
	km: number | null;
	days: number | null;
};
export type ServiceEvent = { id: string; ruleId: string; at: string; note: string };
export type Garage = {
	bikes: Bike[];
	parts: Part[];
	installations: Installation[];
	assignments: Assignment[];
	presets: Preset[];
	rules: ServiceRule[];
	services: ServiceEvent[];
};
export const emptyGarage = (): Garage => ({
	bikes: [],
	parts: [],
	installations: [],
	assignments: [],
	presets: [],
	rules: [],
	services: [],
});
export const kindLabels: Record<PartKind, string> = {
	wheelset: "휠셋",
	tire: "타이어",
	chain: "체인",
	cassette: "스프라켓",
	brake: "브레이크",
};
export const isRide = (a: StravaActivity) => /ride$/i.test(a.sport_type || a.type);
const isIndoorRide = (a: StravaActivity) =>
	Boolean(a.trainer || (a.sport_type || a.type) === "VirtualRide");
export const appliesIndoors = (slot: Slot) => slot === "chain" || slot === "cassette";
export const activityTime = (a: StravaActivity) => Date.parse(a.start_date);

export function partPeriods(garage: Garage, partId: string, now = Date.now()) {
	const part = garage.parts.find((p) => p.id === partId);
	if (!part) return [];
	const periods: { bikeId: string; start: number; end: number; current: boolean }[] = [];
	for (const bike of garage.bikes) {
		const history = garage.installations
			.filter((i) => i.bikeId === bike.id)
			.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
		for (let index = 0; index < history.length; index++) {
			if (!Object.values(history[index].parts).includes(partId)) continue;
			const start = Math.max(Date.parse(history[index].at), Date.parse(part.startedAt));
			const end = Math.min(
				history[index + 1] ? Date.parse(history[index + 1].at) : now,
				part.retiredAt ? Date.parse(part.retiredAt) : now,
				now,
			);
			if (end > start)
				periods.push({
					bikeId: bike.id,
					start,
					end,
					current: !history[index + 1] && !part.retiredAt,
				});
		}
	}
	return periods.sort((a, b) => b.start - a.start);
}

export function configurationAt(garage: Garage, bikeId: string, at: string): Configuration {
	return (
		garage.installations
			.filter((i) => i.bikeId === bikeId && Date.parse(i.at) <= Date.parse(at))
			.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]?.parts ?? {}
	);
}

export function assignmentFor(garage: Garage, activity: StravaActivity): Assignment | null {
	if (!isRide(activity)) return null;
	const explicit = garage.assignments.find((a) => a.activityId === activity.id);
	if (explicit) return explicit;
	const bike = garage.bikes.find((b) => b.stravaGearId && b.stravaGearId === activity.gear_id);
	if (!bike) return null;
	return {
		activityId: activity.id,
		bikeId: bike.id,
		parts: configurationAt(garage, bike.id, activity.start_date),
	};
}

export function partDistance(
	garage: Garage,
	activities: StravaActivity[],
	partId: string,
	since?: string,
): number {
	const part = garage.parts.find((p) => p.id === partId);
	if (!part) return 0;
	const from = Math.max(Date.parse(part.startedAt), since ? Date.parse(since) : -Infinity);
	const until = part.retiredAt ? Date.parse(part.retiredAt) : Infinity;
	const meters = activities.reduce((sum, a) => {
		if (activityTime(a) < from || activityTime(a) >= until) return sum;
		const assignment = assignmentFor(garage, a);
		const uses = Object.entries(assignment?.parts ?? {}).some(
			([slot, id]) => id === partId && (!isIndoorRide(a) || appliesIndoors(slot as Slot)),
		);
		return sum + (uses ? a.distance : 0);
	}, 0);
	return meters / 1000 + (since ? 0 : part.initialKm);
}

export function serviceStatus(
	garage: Garage,
	activities: StravaActivity[],
	rule: ServiceRule,
	now = Date.now(),
) {
	const part = garage.parts.find((p) => p.id === rule.targetId);
	const events = garage.services
		.filter((e) => e.ruleId === rule.id && Date.parse(e.at) <= now)
		.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
	const last = events[0]?.at;
	// Existing mileage does not establish a last service date. Ask for a baseline.
	if (!last) return { last: null, km: 0, days: 0, ratio: 0, state: "unknown" as const };
	const km = part
		? partDistance(garage, activities, part.id, last)
		: activities.reduce((sum, a) => {
				if (activityTime(a) < Date.parse(last) || isIndoorRide(a)) return sum;
				return sum + (assignmentFor(garage, a)?.bikeId === rule.targetId ? a.distance / 1000 : 0);
			}, 0);
	const days = Math.max(0, Math.floor((now - Date.parse(last)) / 86400000));
	const ratio = Math.max(rule.km ? km / rule.km : 0, rule.days ? days / rule.days : 0);
	return {
		last,
		km,
		days,
		ratio,
		state: ratio >= 1 ? ("due" as const) : ratio >= 0.8 ? ("soon" as const) : ("ok" as const),
	};
}

export function validateConfiguration(garage: Garage, config: Configuration, at?: string): void {
	const used = new Set<string>();
	for (const [slot, id] of Object.entries(config)) {
		if (!Object.hasOwn(slots, slot) || typeof id !== "string")
			throw new Error("잘못된 부품 위치입니다.");
		const part = garage.parts.find((p) => p.id === id);
		if (!part || part.kind !== slots[slot as Slot].kind)
			throw new Error("부품 종류와 장착 위치가 맞지 않습니다.");
		if (used.has(id)) throw new Error("같은 부품을 두 위치에 동시에 사용할 수 없습니다.");
		if (
			at &&
			(Date.parse(part.startedAt) > Date.parse(at) ||
				(part.retiredAt && Date.parse(part.retiredAt) <= Date.parse(at)))
		)
			throw new Error("부품 사용 기간 밖의 날짜입니다.");
		used.add(id);
	}
}

/** Validate all references at the server boundary, including imported documents. */
export function validateGarage(value: unknown): asserts value is Garage {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("장비 데이터 형식이 잘못되었습니다.");
	const g = value as Garage;
	const arrays = [
		"bikes",
		"parts",
		"installations",
		"assignments",
		"presets",
		"rules",
		"services",
	] as const;
	const text = (v: unknown, max = 160): v is string =>
		typeof v === "string" && v.trim().length > 0 && v.length <= max;
	const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
	const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
	for (const key of arrays) {
		if (
			!Array.isArray(g[key]) ||
			g[key].length > (key === "assignments" ? 20000 : 5000) ||
			g[key].some((v) => !v || typeof v !== "object" || Array.isArray(v))
		)
			throw new Error("장비 목록 형식이 잘못되었습니다.");
		const ids = g[key].map((v) =>
			key === "assignments" ? (v as Assignment).activityId : (v as { id: unknown }).id,
		);
		if (
			ids.some((id) =>
				key === "assignments" ? !(Number.isSafeInteger(id) && Number(id) > 0) : !text(id, 100),
			) ||
			new Set(ids).size !== ids.length
		)
			throw new Error("중복되거나 잘못된 식별자입니다.");
	}
	const bikeIds = new Set(g.bikes.map((b) => b.id));
	if (g.parts.some((p) => bikeIds.has(p.id)))
		throw new Error("자전거와 부품의 식별자는 서로 달라야 합니다.");
	for (const i of g.installations)
		if (!date(i.at) || Date.parse(i.at) > Date.now()) throw new Error("장착 일시를 확인해 주세요.");
	for (const p of g.presets) if (!text(p.name)) throw new Error("조합 이름을 입력해 주세요.");
	for (const b of g.bikes)
		if (!text(b.name) || (b.stravaGearId !== null && !/^b\d+$/.test(b.stravaGearId)))
			throw new Error("자전거 정보를 확인해 주세요.");
	const gearIds = g.bikes.map((b) => b.stravaGearId).filter(Boolean);
	if (new Set(gearIds).size !== gearIds.length)
		throw new Error("Strava 자전거는 한 대에만 연결할 수 있습니다.");
	for (const p of g.parts)
		if (
			!text(p.name) ||
			!Object.hasOwn(kindLabels, p.kind) ||
			!date(p.startedAt) ||
			Date.parse(p.startedAt) > Date.now() ||
			!number(p.initialKm) ||
			(p.retiredAt !== null &&
				(!date(p.retiredAt) || Date.parse(p.retiredAt) < Date.parse(p.startedAt)))
		)
			throw new Error("부품 정보를 확인해 주세요.");
	for (const v of [...g.installations, ...g.presets, ...g.assignments]) {
		if (!bikeIds.has(v.bikeId) || !v.parts || typeof v.parts !== "object" || Array.isArray(v.parts))
			throw new Error("자전거 또는 조합이 잘못되었습니다.");
		if ("at" in v && (!date(v.at) || Date.parse(v.at) > Date.now()))
			throw new Error("장착 일시를 확인해 주세요.");
		if ("name" in v && !text(v.name)) throw new Error("조합 이름을 입력해 주세요.");
		if ("activityId" in v && (!Number.isSafeInteger(v.activityId) || v.activityId <= 0))
			throw new Error("라이딩 식별자가 잘못되었습니다.");
		validateConfiguration(g, v.parts, "at" in v ? v.at : undefined);
	}
	// A physical part cannot be installed on two bikes during overlapping intervals.
	if (
		new Set(g.installations.map((i) => `${i.bikeId}:${Date.parse(i.at)}`)).size !==
		g.installations.length
	)
		throw new Error("같은 자전거의 장착 일시가 중복됩니다.");
	const ordered = [...g.installations].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	const installed = new Map<string, Configuration>();
	const owners = new Map<string, string>();
	for (let index = 0; index < ordered.length; ) {
		let end = index + 1;
		while (end < ordered.length && Date.parse(ordered[end].at) === Date.parse(ordered[index].at))
			end++;
		const batch = ordered.slice(index, end);
		for (const item of batch)
			for (const id of Object.values(installed.get(item.bikeId) ?? {})) owners.delete(id);
		for (const item of batch) {
			for (const id of Object.values(item.parts)) {
				if (owners.has(id))
					throw new Error(
						"한 부품이 여러 자전거에 동시에 장착되어 있습니다. 기존 자전거에서 먼저 분리해 주세요.",
					);
				owners.set(id, item.bikeId);
			}
			installed.set(item.bikeId, item.parts);
		}
		index = end;
	}
	for (const part of g.parts.filter((p) => p.retiredAt)) {
		for (const bike of g.bikes) {
			if (Object.values(configurationAt(g, bike.id, part.retiredAt!)).includes(part.id))
				throw new Error("사용 종료 전에 장착된 자전거에서 부품을 먼저 분리해 주세요.");
		}
	}
	for (const r of g.rules)
		if (
			!text(r.name) ||
			(!bikeIds.has(r.targetId) && !g.parts.some((p) => p.id === r.targetId)) ||
			(r.km !== null && (!number(r.km) || r.km === 0)) ||
			(r.days !== null && (!number(r.days) || r.days === 0)) ||
			(!r.km && !r.days)
		)
			throw new Error("정비 대상과 거리 또는 기간을 입력해 주세요.");
	for (const s of g.services)
		if (
			!g.rules.some((r) => r.id === s.ruleId) ||
			!date(s.at) ||
			Date.parse(s.at) > Date.now() ||
			typeof s.note !== "string" ||
			s.note.length > 2000
		)
			throw new Error("정비 기록을 확인해 주세요.");
}
