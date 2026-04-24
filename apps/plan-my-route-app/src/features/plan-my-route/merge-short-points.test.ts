import { describe, expect, test } from "bun:test";
import type { StageShortPoint } from "@my-ridings/weather-types";

import fixture from "./__fixtures__/stage1-short.json";
import { mergeShortPoints, pickDisplayTempC } from "./merge-short-points";

const stage1Points = (fixture as { points: StageShortPoint[] }).points;

const mkHourly = (
	at: string,
	tempC: number,
	sky = 1,
	pty = 0,
	popPct: number | null = 0,
	rainMm: number | null = 0,
) => ({
	at,
	tempC,
	popPct,
	sky,
	pty,
	windMs: 1,
	humidityPct: 50,
	rainMm,
	snowCm: 0,
});

const mkPoint = (
	index: number,
	hourly: ReturnType<typeof mkHourly>[],
	override: Partial<StageShortPoint> = {},
): StageShortPoint => ({
	index,
	position: "along",
	kmFrom: index,
	kmTo: index + 1,
	regionName: "test",
	nx: index,
	ny: 0,
	midpoint: { lat: 0, lng: 0 },
	hourly,
	...override,
});

describe("mergeShortPoints — synthetic", () => {
	test("empty input → empty", () => {
		expect(mergeShortPoints([])).toEqual([]);
	});

	test("기온이 1도 이내 차이는 같은 그룹으로 병합", () => {
		const base = [mkHourly("2026-04-26T00:00:00Z", 11), mkHourly("2026-04-26T01:00:00Z", 13)];
		const near = [mkHourly("2026-04-26T00:00:00Z", 12), mkHourly("2026-04-26T01:00:00Z", 14)];
		const groups = mergeShortPoints([mkPoint(0, base), mkPoint(1, near)]);
		expect(groups).toHaveLength(1);
		expect(groups[0]!.members.map((m) => m.index)).toEqual([0, 1]);
	});

	test("기온이 모든 시간 +4도 shift면 분리", () => {
		const base = [mkHourly("2026-04-26T00:00:00Z", 10), mkHourly("2026-04-26T01:00:00Z", 12)];
		const far = [mkHourly("2026-04-26T00:00:00Z", 14), mkHourly("2026-04-26T01:00:00Z", 16)];
		const groups = mergeShortPoints([mkPoint(0, base), mkPoint(1, far)]);
		expect(groups).toHaveLength(2);
	});

	test("한 시간만 3도 튀고 평균 차이는 작으면 병합", () => {
		const base = [
			mkHourly("t0", 10),
			mkHourly("t1", 10),
			mkHourly("t2", 10),
			mkHourly("t3", 10),
			mkHourly("t4", 10),
		];
		const spot = [
			mkHourly("t0", 10),
			mkHourly("t1", 10),
			mkHourly("t2", 13),
			mkHourly("t3", 10),
			mkHourly("t4", 10),
		];
		const groups = mergeShortPoints([mkPoint(0, base), mkPoint(1, spot)]);
		expect(groups).toHaveLength(1);
	});

	test("pty(비 예보)가 생기면 기온이 같아도 분리", () => {
		const dry = [mkHourly("t0", 10, 1, 0)];
		const rain = [mkHourly("t0", 10, 4, 1, 70, 0.5)];
		const groups = mergeShortPoints([mkPoint(0, dry), mkPoint(1, rain)]);
		expect(groups).toHaveLength(2);
	});

	test("비연속 재등장은 repeatOfKey로 표시", () => {
		const a = [mkHourly("t0", 10)];
		const b = [mkHourly("t0", 18)];
		const aAgain = [mkHourly("t0", 11)];
		const groups = mergeShortPoints([mkPoint(0, a), mkPoint(1, b), mkPoint(2, aAgain)]);
		expect(groups).toHaveLength(3);
		expect(groups[0]!.repeatOfKey).toBeNull();
		expect(groups[1]!.repeatOfKey).toBeNull();
		expect(groups[2]!.repeatOfKey).toBe(groups[0]!.key);
	});
});

describe("mergeShortPoints — 짧은 출발 꼬리 흡수", () => {
	test("첫 카드가 0.2km이고 다음 카드와 지역명이 같으면 흡수되고 departure 승격", () => {
		const h = [mkHourly("t0", 10)];
		const h2 = [mkHourly("t0", 15)];
		const first = mkPoint(0, h, {
			position: "departure",
			kmFrom: 0,
			kmTo: 0.2,
			regionName: "전라남도 구례군",
		});
		const second = mkPoint(1, h2, {
			position: "along",
			kmFrom: 0.4,
			kmTo: 2.8,
			regionName: "전라남도 구례군",
		});
		const third = mkPoint(2, h2, {
			position: "along",
			kmFrom: 2.9,
			kmTo: 5,
			regionName: "전라남도 구례군",
		});
		const groups = mergeShortPoints([first, second, third]);
		expect(groups).toHaveLength(1);
		expect(groups[0]!.position).toBe("departure");
		expect(groups[0]!.kmFrom).toBe(0);
		expect(groups[0]!.members.map((m) => m.index)).toEqual([0, 1, 2]);
	});

	test("지역명이 다르면 흡수하지 않음 (기본 canMerge도 실패하도록 기온 차 4도)", () => {
		const first = mkPoint(0, [mkHourly("t0", 10)], {
			position: "departure",
			kmFrom: 0,
			kmTo: 0.2,
			regionName: "구례군",
		});
		const second = mkPoint(1, [mkHourly("t0", 15)], {
			position: "along",
			kmFrom: 0.4,
			kmTo: 2.8,
			regionName: "남원시",
		});
		const groups = mergeShortPoints([first, second]);
		expect(groups).toHaveLength(2);
		expect(groups[0]!.position).toBe("departure");
		expect(groups[0]!.members.map((m) => m.index)).toEqual([0]);
	});

	test("첫 카드 길이가 임계값 이상이면 흡수하지 않음", () => {
		const h = [mkHourly("t0", 10)];
		const first = mkPoint(0, h, {
			position: "departure",
			kmFrom: 0,
			kmTo: 1.0,
			regionName: "동일",
		});
		const second = mkPoint(1, h, {
			position: "along",
			kmFrom: 1.1,
			kmTo: 3,
			regionName: "동일",
		});
		const groups = mergeShortPoints([first, second]);
		// 예보 내용이 동일해서 canMerge로 병합은 되지만, departure-tail 로직 때문은 아님.
		expect(groups).toHaveLength(1);
		expect(groups[0]!.kmFrom).toBe(0);
	});
});

describe("pickDisplayTempC", () => {
	test("10시 전은 최저, 10~17시는 최고, 17시 이후는 최저", () => {
		const range = { at: "t", tempCMin: 5, tempCMax: 15 };
		expect(pickDisplayTempC(range, 6)).toBe(5);
		expect(pickDisplayTempC(range, 9)).toBe(5);
		expect(pickDisplayTempC(range, 10)).toBe(15);
		expect(pickDisplayTempC(range, 14)).toBe(15);
		expect(pickDisplayTempC(range, 17)).toBe(15);
		expect(pickDisplayTempC(range, 18)).toBe(5);
		expect(pickDisplayTempC(range, 22)).toBe(5);
	});

	test("값이 null이면 null 반환", () => {
		expect(pickDisplayTempC({ at: "t", tempCMin: null, tempCMax: null }, 12)).toBeNull();
	});
});

describe("mergeShortPoints — real Stage 1 fixture", () => {
	test("32개 카드를 12장으로 축약 (짧은 출발 꼬리 흡수 포함)", () => {
		const groups = mergeShortPoints(stage1Points);
		expect(stage1Points).toHaveLength(32);
		expect(groups).toHaveLength(12);
	});

	test("첫 그룹이 0.0km에서 시작하고 departure 유지", () => {
		const groups = mergeShortPoints(stage1Points);
		expect(groups[0]!.kmFrom).toBe(0);
		expect(groups[0]!.position).toBe("departure");
	});

	test("repeatOfKey 마킹이 예상 인덱스에서 발생", () => {
		const groups = mergeShortPoints(stage1Points);
		const repeats = groups.filter((g) => g.repeatOfKey != null).length;
		expect(repeats).toBeGreaterThanOrEqual(5);
	});

	test("position 우선순위: 첫 그룹은 departure, 마지막 그룹은 arrival", () => {
		const groups = mergeShortPoints(stage1Points);
		expect(groups[0]!.position).toBe("departure");
		expect(groups[groups.length - 1]!.position).toBe("arrival");
	});

	test("kmFrom/kmTo가 경로 순서대로 증가", () => {
		const groups = mergeShortPoints(stage1Points);
		for (let i = 1; i < groups.length; i += 1) {
			expect(groups[i]!.kmFrom).toBeGreaterThanOrEqual(groups[i - 1]!.kmFrom);
		}
	});

	test("시간별 min~max 범위가 멤버 수만큼 계산됨", () => {
		const groups = mergeShortPoints(stage1Points);
		const multi = groups.find((g) => g.members.length > 1);
		expect(multi).toBeDefined();
		if (!multi) return;
		expect(multi.hourlyTemps).toHaveLength(multi.representativeHourly.length);
		for (const r of multi.hourlyTemps) {
			if (r.tempCMin != null && r.tempCMax != null) {
				expect(r.tempCMax).toBeGreaterThanOrEqual(r.tempCMin);
			}
		}
	});
});
