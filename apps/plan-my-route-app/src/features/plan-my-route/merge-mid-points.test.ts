import { describe, expect, test } from "bun:test";
import type { StageMidPoint } from "@my-ridings/weather-types";

import fixture from "./__fixtures__/stage3-mid.json";
import { mergeMidPoints } from "./merge-mid-points";

const stage3Points = (fixture as { points: StageMidPoint[] }).points;

const mkDaily = (
	date: string,
	override: Partial<{
		tmn: number | null;
		tmx: number | null;
		amSky: string | null;
		pmSky: string | null;
		amPop: number | null;
		pmPop: number | null;
	}> = {},
) => ({
	date,
	tmn: 10,
	tmx: 20,
	amSky: "맑음" as string | null,
	pmSky: "맑음" as string | null,
	amPop: 0 as number | null,
	pmPop: 0 as number | null,
	...override,
});

const mkMidPoint = (
	index: number,
	daily: ReturnType<typeof mkDaily> | null,
	override: Partial<StageMidPoint> = {},
): StageMidPoint => ({
	index,
	position: "along",
	kmFrom: index * 10,
	kmTo: index * 10 + 10,
	regionName: "테스트시",
	nx: index,
	ny: 0,
	midpoint: { lat: 35, lng: 127 },
	daily,
	...override,
});

describe("mergeMidPoints — synthetic", () => {
	test("empty → empty", () => {
		expect(mergeMidPoints([])).toEqual([]);
	});

	test("동일 daily 연속 병합", () => {
		const d = mkDaily("2026-05-01");
		const groups = mergeMidPoints([
			mkMidPoint(0, d, { kmFrom: 0, kmTo: 10 }),
			mkMidPoint(1, d, { kmFrom: 10, kmTo: 25 }),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]!.kmFrom).toBe(0);
		expect(groups[0]!.kmTo).toBe(25);
		expect(groups[0]!.members.map((m) => m.index)).toEqual([0, 1]);
	});

	test("daily 한 필드만 다르면 분리", () => {
		const a = mkDaily("2026-05-01", { tmx: 20 });
		const b = mkDaily("2026-05-01", { tmx: 21 });
		const groups = mergeMidPoints([
			mkMidPoint(0, a, { kmFrom: 0, kmTo: 10 }),
			mkMidPoint(1, b, { kmFrom: 10, kmTo: 20 }),
		]);
		expect(groups).toHaveLength(2);
	});

	test("null daily 연속 병합", () => {
		const groups = mergeMidPoints([
			mkMidPoint(0, null, { kmFrom: 0, kmTo: 10 }),
			mkMidPoint(1, null, { kmFrom: 10, kmTo: 30 }),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]!.daily).toBeNull();
	});

	test("비연속 동일 예보 → repeatOfKey", () => {
		const d = mkDaily("2026-05-01");
		const other = mkDaily("2026-05-01", { tmx: 99 });
		const groups = mergeMidPoints([
			mkMidPoint(0, d),
			mkMidPoint(1, other),
			mkMidPoint(2, { ...d, tmx: 20 }),
		]);
		expect(groups).toHaveLength(3);
		expect(groups[0]!.repeatOfKey).toBeNull();
		expect(groups[1]!.repeatOfKey).toBeNull();
		expect(groups[2]!.repeatOfKey).toBe(groups[0]!.key);
	});

	test("짧은 출발 단일 격자 + 동일 daily·지역 → 흡수", () => {
		const d = mkDaily("2026-05-01");
		const groups = mergeMidPoints([
			mkMidPoint(0, d, {
				position: "departure",
				kmFrom: 0,
				kmTo: 0.2,
				regionName: "같은군",
			}),
			mkMidPoint(1, d, {
				position: "along",
				kmFrom: 0.2,
				kmTo: 15,
				regionName: "같은군",
			}),
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]!.position).toBe("departure");
		expect(groups[0]!.members.map((m) => m.index)).toEqual([0, 1]);
	});
});

describe("mergeMidPoints — stage3 fixture", () => {
	test("연속 동일 중기는 런으로 줄어듦", () => {
		const groups = mergeMidPoints(stage3Points);
		expect(groups.length).toBeLessThan(stage3Points.length);
		const merged012 = groups.find((g) => g.members.some((m) => m.index === 0));
		expect(merged012?.members.map((m) => m.index)).toEqual([0, 1]);
		const merged34 = groups.find((g) => g.members.some((m) => m.index === 3));
		expect(merged34?.members.map((m) => m.index)).toEqual([3, 4]);
		const merged56 = groups.find((g) => g.members.some((m) => m.index === 5));
		expect(merged56?.members.map((m) => m.index)).toEqual([5, 6]);
	});

	test("중간 다른 예보(index 2)는 단독 그룹", () => {
		const groups = mergeMidPoints(stage3Points);
		const solo = groups.find((g) => g.members.length === 1 && g.members[0]!.index === 2);
		expect(solo).toBeDefined();
	});

	test("index 3·4는 앞 0·1과 동일 daily → 비연속 repeat", () => {
		const groups = mergeMidPoints(stage3Points);
		const first = groups.find((g) => g.members[0]?.index === 0);
		const afterBreak = groups.find((g) => g.members[0]?.index === 3);
		expect(afterBreak?.repeatOfKey).toBe(first?.key ?? null);
	});
});
